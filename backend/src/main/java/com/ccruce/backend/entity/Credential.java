package com.ccruce.backend.entity;

import com.ccruce.backend.enums.CredentialType;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "credentials")
public class Credential {

    @Id
    private UUID id;

    @Column(nullable = false, length = 180)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private CredentialType type;

    @Column(nullable = false, length = 180)
    private String issuingOrganization;

    @Column(nullable = false)
    private LocalDate expirationDate;

    @Column(nullable = false)
    private Integer renewalCycleMonths;

    @Column(nullable = false)
    private Integer requiredCEHours;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToMany(mappedBy = "credential", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CERecord> ceRecords = new ArrayList<>();

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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public CredentialType getType() {
        return type;
    }

    public void setType(CredentialType type) {
        this.type = type;
    }

    public String getIssuingOrganization() {
        return issuingOrganization;
    }

    public void setIssuingOrganization(String issuingOrganization) {
        this.issuingOrganization = issuingOrganization;
    }

    public LocalDate getExpirationDate() {
        return expirationDate;
    }

    public void setExpirationDate(LocalDate expirationDate) {
        this.expirationDate = expirationDate;
    }

    public Integer getRenewalCycleMonths() {
        return renewalCycleMonths;
    }

    public void setRenewalCycleMonths(Integer renewalCycleMonths) {
        this.renewalCycleMonths = renewalCycleMonths;
    }

    public Integer getRequiredCEHours() {
        return requiredCEHours;
    }

    public void setRequiredCEHours(Integer requiredCEHours) {
        this.requiredCEHours = requiredCEHours;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public List<CERecord> getCeRecords() {
        return ceRecords;
    }

    public void setCeRecords(List<CERecord> ceRecords) {
        this.ceRecords = ceRecords;
    }
}
