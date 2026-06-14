/**
 * Authentication and identity module.
 *
 * <p>Responsibilities: user registration, login with BCrypt password verification,
 * JWT token issuance, and current-user profile retrieval.
 *
 * <p>This module owns the {@code users} table and the {@link com.ticketbox.module.auth.domain.User}
 * aggregate. Other modules reference users by UUID only and never import from this module.
 */
@org.springframework.modulith.ApplicationModule
package com.ticketbox.module.auth;
