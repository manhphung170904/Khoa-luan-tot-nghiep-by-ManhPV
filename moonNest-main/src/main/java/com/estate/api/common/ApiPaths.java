package com.estate.api.common;

public final class ApiPaths {
    public static final String API_V1_PREFIX = "/api/v1/";

    private ApiPaths() {
    }

    public static boolean isApiRequestPath(String path) {
        return path != null && path.startsWith(API_V1_PREFIX);
    }

    public static boolean isVersionedApiPath(String path) {
        return path != null && path.startsWith(API_V1_PREFIX);
    }
}
