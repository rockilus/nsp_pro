/**
 * CloudFront Function to handle trailing slash redirects for Next.js static export
 * 
 * This function ensures that:
 * 1. URLs without trailing slashes are redirected to include them (301 redirect)
 * 2. URLs with trailing slashes are rewritten to append index.html for S3 lookup
 * 3. Static assets and API routes are left unchanged
 * 
 * Required for Next.js static export with trailingSlash: true configuration
 * NSP Pro - Healthcare SaaS Application
 */
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // Skip processing for assets and API routes
    if (uri.startsWith('/_next/') || uri.startsWith('/static/') || uri.startsWith('/api/') || uri.includes('.')) {
        return request;
    }
    
    // Healthcare application security: basic validation to prevent path traversal
    if (uri.includes('..') || uri.includes('//')) {
        return {
            statusCode: 400,
            statusDescription: 'Bad Request'
        };
    }
    
    // If URI doesn't end with / and doesn't have an extension, redirect to add trailing slash
    if (!uri.endsWith('/') && !uri.includes('.')) {
        // Preserve query string in redirect
        var queryString = request.querystring;
        var redirectUri = uri + '/';
        if (queryString && Object.keys(queryString).length > 0) {
            var params = [];
            for (var key in queryString) {
                var value = queryString[key].value;
                params.push(key + '=' + encodeURIComponent(value));
            }
            redirectUri += '?' + params.join('&');
        }
        
        return {
            statusCode: 301,
            statusDescription: 'Moved Permanently',
            headers: {
                'location': { value: redirectUri }
            }
        };
    }
    
    // If URI ends with /, append index.html for S3 lookup
    if (uri.endsWith('/')) {
        request.uri = uri + 'index.html';
    }
    
    return request;
}
