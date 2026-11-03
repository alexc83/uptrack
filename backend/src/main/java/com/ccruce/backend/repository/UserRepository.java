package com.ccruce.backend.repository;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import com.ccruce.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    @Modifying
    @Transactional
    @Query("update User u set u.name = :name, u.email = :email where u.id = :id")
    int updateProfile(UUID id, String name, String email);

    @Modifying
    @Transactional
    @Query("update User u set u.password = :next where u.id = :id and u.password = :previous")
    int changePassword(UUID id, String previous, String next);
}
