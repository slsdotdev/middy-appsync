import { Construct } from "constructs";
import {
  BaseDataSource,
  Code,
  FunctionRuntime,
  IFunctionConfigurationRef,
  IGraphqlApi,
  LambdaDataSource,
} from "aws-cdk-lib/aws-appsync";
import { AnyResolver } from "@middy-appsync/graphql";
import { FileSystem } from "aws-cdk-lib/core";
import { buildSources } from "../utils/build.js";
import * as path from "node:path";
import {
  BuildFieldResolverInfo,
  BuildPipelineFunctionInfo,
  DEFAULT_MAX_BATCH_SIZE,
  resolveTemplates,
} from "./utils.js";

export interface MiddyAppsyncGraphQLResolversProps {
  api: IGraphqlApi;
  /**
   * The list of resolvers to be registered with the AppSync API. Each resolver must have a unique combination of typeName and fieldName.
   */
  resolvers: AnyResolver[];

  /**
   * Main LambdaDataSource that will be used by the router.
   */
  dataSource: LambdaDataSource;

  /**
   * Additional dataSources configured in the AppSync API that can be used by resolver templates.
   * The key of each entry should match the name used in the `@datasource` comment tag in the resolver template (e.g. `dynamoDbDataSource`).
   */
  additionalDataSources?: Record<string, BaseDataSource>;

  /**
   * Optional path to source JS resolver templates that will be bundled and deployed with the stack.
   *
   * Template filenames must match the pattern `{typeName}.{fieldName}.ts` (e.g. `Query.getUser.ts`, `User.name.ts`, etc.).
   * Resolvers that don't match the pattern will be considered pipeline functions.
   *
   * By default, templates will be attached to the base lambda data source. Comment tags can be used to specify which template goes to which data source, and to specify the type of the resolver (unit or pipeline).
   *
   * @example
   * ```ts
   * // Example of a template file with multiple resolvers and data sources specified via comment tags
   *
   * // Query.getUser.ts
   *
   * /**
   *  * `@datasource` dynamoDbDataSource
   *  * `@pipeline` function1, function2
   *  *\/
   * ```
   * ```ts
   *
   * export function request() {
   *   // resolver implementation
   * }
   *
   * export function response() {
   *   // response implementation
   * }
   * ```
   */
  templateSource?: string | string[];
}

export class MiddyAppsyncGraphQLResolvers extends Construct {
  constructor(scope: Construct, id: string, props: MiddyAppsyncGraphQLResolversProps) {
    super(scope, id);

    const { api, resolvers, dataSource, additionalDataSources = {}, templateSource } = props;

    const templates = this._buildTemplates(templateSource);
    const resolverMap = new Map(resolvers.map((r) => [`${r.typeName}.${r.fieldName}`, r]));

    const pipelineFunctions = this._createPipelineFunctions(
      templates.pipelineFunctions,
      dataSource,
      additionalDataSources
    );

    this._createFieldResolvers(
      api,
      templates.fieldResolvers,
      resolverMap,
      pipelineFunctions,
      dataSource,
      additionalDataSources
    );

    if (resolverMap.size > 0) {
      for (const [key, resolver] of resolverMap.entries()) {
        const assetSource = resolver.batch
          ? templates.default.batchInvoke
          : templates.default.invoke;

        dataSource.createResolver(key, {
          typeName: resolver.typeName,
          fieldName: resolver.fieldName,
          code: Code.fromAsset(assetSource),
          runtime: FunctionRuntime.JS_1_0_0,
          maxBatchSize: resolver.batch ? DEFAULT_MAX_BATCH_SIZE : undefined,
        });
      }
    }
  }

  private _buildTemplates(templateSource: string | string[] | undefined) {
    const outDir = FileSystem.mkdtemp("middy-appsync-templates-");
    const __dirname = path.dirname(new URL(import.meta.url).pathname);

    const [defaultInvokeSource, defaultBatchInvokeSource] = buildSources(
      [
        path.join(__dirname, "templates", "invoke.js"),
        path.join(__dirname, "templates", "batch-invoke.js"),
      ],
      outDir
    );

    if (!templateSource) {
      return {
        default: {
          invoke: defaultInvokeSource,
          batchInvoke: defaultBatchInvokeSource,
        },
        fieldResolvers: new Map<string, BuildFieldResolverInfo>(),
        pipelineFunctions: new Map<string, BuildPipelineFunctionInfo>(),
      };
    }

    const templatePaths = Array.isArray(templateSource) ? templateSource : [templateSource];
    const templateInfo = resolveTemplates(templatePaths);

    const fieldResolvers = new Map<string, BuildFieldResolverInfo>();
    const pipelineFunctions = new Map<string, BuildPipelineFunctionInfo>();

    if (templateInfo.fieldResolvers.length) {
      const buildFieldResolvers = buildSources(
        templateInfo.fieldResolvers.map((r) => r.sourcePath),
        outDir
      );

      for (const [i, info] of templateInfo.fieldResolvers.entries()) {
        const key = `${info.typeName}.${info.fieldName}`;
        fieldResolvers.set(key, { ...info, buildPath: buildFieldResolvers[i] });
      }
    }

    if (templateInfo.pipelineFunctions.length) {
      const buildPipelineFunctions = buildSources(
        templateInfo.pipelineFunctions.map((f) => f.sourcePath),
        outDir
      );

      for (const [i, info] of templateInfo.pipelineFunctions.entries()) {
        pipelineFunctions.set(info.name, { ...info, buildPath: buildPipelineFunctions[i] });
      }
    }

    return {
      default: {
        invoke: defaultInvokeSource,
        batchInvoke: defaultBatchInvokeSource,
      },
      fieldResolvers,
      pipelineFunctions,
    };
  }

  private _resolveDataSource(
    dataSourceName: string | null,
    defaultDataSource: LambdaDataSource,
    additionalDataSources: Record<string, BaseDataSource>
  ) {
    if (!dataSourceName) {
      return defaultDataSource;
    }

    const ds = additionalDataSources[dataSourceName];

    if (!ds) {
      throw new Error(
        `Data source "${dataSourceName}" not found in additionalDataSources. Make sure to provide all data sources referenced in resolver templates via the additionalDataSources prop.`
      );
    }

    return ds;
  }

  private _createPipelineFunctions(
    functionsInfo: Map<string, BuildPipelineFunctionInfo>,
    defaultDataSource: LambdaDataSource,
    dataSources: Record<string, BaseDataSource>
  ) {
    const pipelineFunctions: Record<string, IFunctionConfigurationRef> = {};

    for (const [name, info] of functionsInfo.entries()) {
      const ds = this._resolveDataSource(info.dataSource, defaultDataSource, dataSources);
      const fn = ds.createFunction(name, {
        name,
        code: Code.fromAsset(info.buildPath),
        runtime: FunctionRuntime.JS_1_0_0,
      });

      pipelineFunctions[name] = fn;
    }

    return pipelineFunctions;
  }

  private _createFieldResolvers(
    api: IGraphqlApi,
    resolversInfo: Map<string, BuildFieldResolverInfo>,
    resolverMap: Map<string, AnyResolver>,
    pipelineFunctions: Record<string, IFunctionConfigurationRef>,
    defaultDataSource: LambdaDataSource,
    dataSources: Record<string, BaseDataSource>
  ) {
    for (const [key, info] of resolversInfo.entries()) {
      const ds = this._resolveDataSource(info.dataSource, defaultDataSource, dataSources);
      const resolver = resolverMap.get(key);

      const maxBatchSize = resolver?.batch ? DEFAULT_MAX_BATCH_SIZE : undefined;
      const pipelineConfig = info.pipeline.length
        ? info.pipeline.map((fnName) => {
            const fn = pipelineFunctions[fnName];
            if (!fn) {
              throw new Error(
                `Pipeline function "${fnName}" not found for resolver "${key}". Make sure all pipeline functions referenced in resolver templates are included in the templateSource prop.`
              );
            }
            return fn;
          })
        : undefined;

      api.createResolver(key, {
        typeName: info.typeName,
        fieldName: info.fieldName,
        code: Code.fromAsset(info.buildPath),
        dataSource: pipelineConfig?.length ? undefined : ds,
        runtime: FunctionRuntime.JS_1_0_0,
        maxBatchSize,
        pipelineConfig,
      });

      resolverMap.delete(key);
    }
  }
}
