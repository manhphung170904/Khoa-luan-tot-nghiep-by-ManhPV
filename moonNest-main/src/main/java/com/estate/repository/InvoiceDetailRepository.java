package com.estate.repository;

import com.estate.repository.entity.InvoiceDetailEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceDetailRepository extends JpaRepository<InvoiceDetailEntity, Long> {

}
