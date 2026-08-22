package com.statistiloto.server.exception;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Logs every API request at INFO level with method, URI, response status,
 * and the authenticated user's JWT subject (when available).
 * Failed requests (4xx/5xx) are logged at WARN.
 */
@Component
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        try {
            chain.doFilter(req, res);
        } finally {
            int status = res.getStatus();
            String method = req.getMethod();
            String uri = req.getRequestURI();
            String userSub = extractUserSub();

            if (status >= 500) {
                log.error("REQUEST {} {} → {} (user: {}, client: {})", method, uri, status, userSub, req.getRemoteAddr());
            } else if (status >= 400) {
                log.warn("REQUEST {} {} → {} (user: {}, client: {})", method, uri, status, userSub, req.getRemoteAddr());
            } else {
                log.info("REQUEST {} {} → {} (user: {})", method, uri, status, userSub);
            }
        }
    }

    private String extractUserSub() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            return jwt.getSubject();
        }
        return "anonymous";
    }
}
