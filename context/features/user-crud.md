# Feature: User CRUD

## Goal
Implement full CRUD functionality for the User entity.

## Requirements

### Entity: User
Fields:
- id (UUID)
- name (String)
- email (String, unique)
- password (String)
- createdAt (LocalDateTime)

### DTOs
- UserRequestDto (name, email, password)
- UserResponseDto (id, name, email, createdAt)

### Repository
- Interface extends JpaRepository<User, UUID>

### Service
Interface:
- createUser(UserRequestDto)
- getAllUsers()
- getUserById(UUID id)
- updateUser(UUID id, UserRequestDto)
- deleteUser(UUID id)

Implementation:
- Validate unique email
- Throw exception if user not found

### Controller
Base path: /api/users

Endpoints:
- POST /api/users
- GET /api/users
- GET /api/users/{id}
- PUT /api/users/{id}
- DELETE /api/users/{id}

### Notes
- Do NOT use entities directly in controller
- Use DTO mapping in service layer
- Use @Valid for request validation