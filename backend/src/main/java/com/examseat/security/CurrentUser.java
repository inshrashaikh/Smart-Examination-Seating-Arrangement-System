package com.examseat.security;

import com.examseat.exception.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/** Convenience accessors for the signed-in principal. */
public final class CurrentUser {

    private CurrentUser() { }

    /** Email of the caller, or {@code null} when the request is anonymous. */
    public static String email() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getName() == null) return null;
        return auth.getName();
    }

    /** Email of the caller, required — throws 401 when anonymous. */
    public static String requireEmail() {
        String email = email();
        if (email == null) {
            throw ApiException.unauthorized("Authentication required");
        }
        return email;
    }

    public static boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    /**
     * Resolves an {@code ?email=} parameter that names whose data to read.
     *
     * <p>An admin may inspect any account. A faculty member may only ever inspect
     * their own: the parameter exists so an admin can look up somebody else, and
     * honouring it unconditionally would let any signed-in user read a
     * colleague's duties and dashboard by changing one query string.</p>
     *
     * @throws ApiException 403 when a non-admin asks for someone else
     */
    public static String resolveTarget(String requestedEmail) {
        String self = requireEmail();
        if (requestedEmail == null || requestedEmail.isBlank()) {
            return self;
        }
        String target = requestedEmail.trim();
        if (target.equalsIgnoreCase(self) || isAdmin()) {
            return target;
        }
        throw ApiException.forbidden("You can only view your own records");
    }
}
