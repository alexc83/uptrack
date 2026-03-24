package com.ccruce.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "ce_records")
public class CERecord {

    @Id
    private UUID id;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(nullable = false, length = 180)
    private String provider;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal hours;

    @Column(nullable = false)
    private LocalDate dateCompleted;

    @Column(length = 500)
    private String certificateUrl;

    @Column(length = 255)
    private String certificatePublicId;

    @Column(length = 40)
    private String certificateResourceType;

    @Column(length = 255)
    private String certificateOriginalFilename;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "credential_id", nullable = false)
    private Credential credential;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public BigDecimal getHours() {
        return hours;
    }

    public void setHours(BigDecimal hours) {
        this.hours = hours;
    }

    public LocalDate getDateCompleted() {
        return dateCompleted;
    }

    public void setDateCompleted(LocalDate dateCompleted) {
        this.dateCompleted = dateCompleted;
    }

    public String getCertificateUrl() {
        return certificateUrl;
    }

    public void setCertificateUrl(String certificateUrl) {
        this.certificateUrl = certificateUrl;
    }

    public String getCertificatePublicId() {
        return certificatePublicId;
    }

    public void setCertificatePublicId(String certificatePublicId) {
        this.certificatePublicId = certificatePublicId;
    }

    public String getCertificateResourceType() {
        return certificateResourceType;
    }

    public void setCertificateResourceType(String certificateResourceType) {
        this.certificateResourceType = certificateResourceType;
    }

    public String getCertificateOriginalFilename() {
        return certificateOriginalFilename;
    }

    public void setCertificateOriginalFilename(String certificateOriginalFilename) {
        this.certificateOriginalFilename = certificateOriginalFilename;
    }

    public Credential getCredential() {
        return credential;
    }

    public void setCredential(Credential credential) {
        this.credential = credential;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }
}
