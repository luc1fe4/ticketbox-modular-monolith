package com.ticketbox.module.auth.web;

import com.ticketbox.infrastructure.security.SecurityConfig;
import com.ticketbox.module.auth.domain.User;
import com.ticketbox.module.auth.domain.UserRepository;
import com.ticketbox.infrastructure.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@RestController
class TestAdminController {
    @GetMapping("/api/admin/test")
    public String adminTest() {
        return "admin-ok";
    }
    @GetMapping("/api/admin/users/test")
    public String adminUsersTest() {
        return "admin-users-ok";
    }
}

@RestController
class TestStaffController {
    @GetMapping("/api/staff/test")
    public String staffTest() {
        return "staff-ok";
    }
}

@WebMvcTest(controllers = {TestAdminController.class, TestStaffController.class})
@Import(SecurityConfig.class)
class SecurityRbacTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private UserRepository userRepository;

    private UsernamePasswordAuthenticationToken createAuthToken(User.Role role) {
        User user = new User();
        org.springframework.test.util.ReflectionTestUtils.setField(user, "id", UUID.fromString("11111111-1111-1111-1111-111111111111"));
        user.setEmail(role.name().toLowerCase() + "@example.com");
        user.setRole(role);
        user.setActive(true);

        return new UsernamePasswordAuthenticationToken(
                user,
                null,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role.name()))
        );
    }

    @Test
    void adminEndpoint_WithAudience_Returns403() throws Exception {
        mockMvc.perform(get("/api/admin/test")
                        .with(authentication(createAuthToken(User.Role.AUDIENCE))))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminEndpoint_WithAdmin_Returns200() throws Exception {
        mockMvc.perform(get("/api/admin/test")
                        .with(authentication(createAuthToken(User.Role.ADMIN))))
                .andExpect(status().isOk());
    }

    @Test
    void adminEndpoint_WithOrganizer_Returns200() throws Exception {
        mockMvc.perform(get("/api/admin/test")
                        .with(authentication(createAuthToken(User.Role.ORGANIZER))))
                .andExpect(status().isOk());
    }

    @Test
    void adminUsersEndpoint_WithOrganizer_Returns403() throws Exception {
        mockMvc.perform(get("/api/admin/users/test")
                        .with(authentication(createAuthToken(User.Role.ORGANIZER))))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminUsersEndpoint_WithAdmin_Returns200() throws Exception {
        mockMvc.perform(get("/api/admin/users/test")
                        .with(authentication(createAuthToken(User.Role.ADMIN))))
                .andExpect(status().isOk());
    }

    @Test
    void staffEndpoint_WithAudience_Returns403() throws Exception {
        mockMvc.perform(get("/api/staff/test")
                        .with(authentication(createAuthToken(User.Role.AUDIENCE))))
                .andExpect(status().isForbidden());
    }

    @Test
    void staffEndpoint_WithStaff_Returns200() throws Exception {
        mockMvc.perform(get("/api/staff/test")
                        .with(authentication(createAuthToken(User.Role.STAFF))))
                .andExpect(status().isOk());
    }
}
