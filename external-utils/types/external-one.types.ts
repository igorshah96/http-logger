export type CustomLoggerInfo = {
    userId: string | undefined;
    traceId: string | undefined;
    url: string;
    method: string;
    bffPath: string;
    response: {
        statusCode: number | string;
        statusText: string;
        headers: Headers;
        data: object | string;
    };
    request: {
        params: Record<string, string>;
        data: object | string;
        headers: Headers;
    };
};