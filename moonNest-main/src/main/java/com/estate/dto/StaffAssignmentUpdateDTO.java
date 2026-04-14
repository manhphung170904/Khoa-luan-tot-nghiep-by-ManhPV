package com.estate.dto;

import java.util.List;

public class StaffAssignmentUpdateDTO {
    private List<Long> buildingIds;
    private List<Long> customerIds;

    public StaffAssignmentUpdateDTO() {}

    public List<Long> getBuildingIds() { return buildingIds; }
    public void setBuildingIds(List<Long> buildingIds) { this.buildingIds = buildingIds; }

    public List<Long> getCustomerIds() { return customerIds; }
    public void setCustomerIds(List<Long> customerIds) { this.customerIds = customerIds; }
}