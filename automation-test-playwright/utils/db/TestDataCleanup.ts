import { MySqlDbClient } from "./MySqlDbClient";

export type CleanupScope = {
  buildingIds?: number[];
  customerIds?: number[];
  staffIds?: number[];
  contractIds?: number[];
  saleContractIds?: number[];
  propertyRequestIds?: number[];
  emails?: string[];
};

type IdFilter = {
  column: string;
  ids: number[];
};

type CleanupOptions = {
  logPrefix?: string;
  log?: boolean;
};

function uniqueNumbers(values: number[] = []): number[] {
  return [...new Set(values.filter((value) => Number.isInteger(value) && value > 0))];
}

function uniqueStrings(values: string[] = []): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

function buildInClause(values: readonly unknown[]): { sql: string; params: unknown[] } {
  if (!values.length) {
    return { sql: "(NULL)", params: [] };
  }

  return {
    sql: `(${values.map(() => "?").join(", ")})`,
    params: [...values]
  };
}

function buildOrIdFilter(filters: IdFilter[]): { sql: string; params: number[] } {
  const active = filters
    .map((filter) => ({ column: filter.column, ids: uniqueNumbers(filter.ids) }))
    .filter((filter) => filter.ids.length > 0);

  if (!active.length) {
    return { sql: "1 = 0", params: [] };
  }

  const sql = active
    .map((filter) => `${filter.column} IN (${filter.ids.map(() => "?").join(", ")})`)
    .join(" OR ");

  return {
    sql,
    params: active.flatMap((filter) => filter.ids)
  };
}

async function fetchContractIds(
  scope: Required<Pick<CleanupScope, "buildingIds" | "customerIds" | "staffIds" | "contractIds">>
): Promise<number[]> {
  const filter = buildOrIdFilter([
    { column: "id", ids: scope.contractIds },
    { column: "building_id", ids: scope.buildingIds },
    { column: "customer_id", ids: scope.customerIds },
    { column: "staff_id", ids: scope.staffIds }
  ]);

  if (filter.params.length === 0) {
    return [];
  }

  const rows = await MySqlDbClient.query<{ id: number }>(
    `SELECT id FROM contract WHERE ${filter.sql}`,
    filter.params
  );

  return uniqueNumbers(rows.map((row) => row.id));
}

async function fetchSaleContractIds(
  scope: Required<Pick<CleanupScope, "buildingIds" | "customerIds" | "staffIds" | "saleContractIds">>
): Promise<number[]> {
  const filter = buildOrIdFilter([
    { column: "id", ids: scope.saleContractIds },
    { column: "building_id", ids: scope.buildingIds },
    { column: "customer_id", ids: scope.customerIds },
    { column: "staff_id", ids: scope.staffIds }
  ]);

  if (filter.params.length === 0) {
    return [];
  }

  const rows = await MySqlDbClient.query<{ id: number }>(
    `SELECT id FROM sale_contract WHERE ${filter.sql}`,
    filter.params
  );

  return uniqueNumbers(rows.map((row) => row.id));
}

async function fetchEmailsForIds(table: "customer" | "staff", ids: number[]): Promise<string[]> {
  const uniqueIds = uniqueNumbers(ids);
  if (!uniqueIds.length) {
    return [];
  }

  const idClause = buildInClause(uniqueIds);
  const rows = await MySqlDbClient.query<{ email: string | null }>(
    `SELECT email FROM ${table} WHERE id IN ${idClause.sql}`,
    idClause.params
  );

  return uniqueStrings(rows.map((row) => row.email ?? ""));
}

async function deleteInvoices(contractIds: number[], customerIds: number[]): Promise<void> {
  const filter = buildOrIdFilter([
    { column: "contract_id", ids: contractIds },
    { column: "customer_id", ids: customerIds }
  ]);

  if (filter.params.length === 0) {
    return;
  }

  const invoiceRows = await MySqlDbClient.query<{ id: number }>(
    `SELECT id FROM invoice WHERE ${filter.sql}`,
    filter.params
  );
  const invoiceIds = uniqueNumbers(invoiceRows.map((row) => row.id));

  if (invoiceIds.length > 0) {
    const invoiceClause = buildInClause(invoiceIds);
    await MySqlDbClient.execute(
      `DELETE FROM invoice_detail WHERE invoice_id IN ${invoiceClause.sql}`,
      invoiceClause.params
    );
  }

  await MySqlDbClient.execute(`DELETE FROM invoice WHERE ${filter.sql}`, filter.params);
}

async function deleteUtilityMeters(contractIds: number[]): Promise<void> {
  if (!contractIds.length) {
    return;
  }

  const contractClause = buildInClause(contractIds);
  await MySqlDbClient.execute(
    `DELETE FROM utility_meter WHERE contract_id IN ${contractClause.sql}`,
    contractClause.params
  );
}

async function deleteEmailVerifications(emails: string[]): Promise<void> {
  const normalizedEmails = uniqueStrings(emails);
  if (!normalizedEmails.length) {
    return;
  }

  const emailClause = buildInClause(normalizedEmails);
  await MySqlDbClient.execute(
    `DELETE FROM email_verification WHERE LOWER(email) IN ${emailClause.sql}`,
    emailClause.params
  );
}

async function deleteRefreshTokens(userType: "CUSTOMER" | "STAFF", userIds: number[]): Promise<void> {
  const ids = uniqueNumbers(userIds);
  if (!ids.length) {
    return;
  }

  const idClause = buildInClause(ids);
  await MySqlDbClient.execute(
    `DELETE FROM refresh_token WHERE user_type = ? AND user_id IN ${idClause.sql}`,
    [userType, ...idClause.params]
  );
}

async function deletePasswordResetTokens(userType: "CUSTOMER" | "STAFF", userIds: number[]): Promise<void> {
  const ids = uniqueNumbers(userIds);
  if (!ids.length) {
    return;
  }

  const idClause = buildInClause(ids);
  await MySqlDbClient.execute(
    `DELETE FROM password_reset_token WHERE user_type = ? AND user_id IN ${idClause.sql}`,
    [userType, ...idClause.params]
  );
}

async function deleteOauthIdentities(userType: "CUSTOMER" | "STAFF", userIds: number[]): Promise<void> {
  const ids = uniqueNumbers(userIds);
  if (!ids.length) {
    return;
  }

  const idClause = buildInClause(ids);
  await MySqlDbClient.execute(
    `DELETE FROM oauth_identity WHERE user_type = ? AND user_id IN ${idClause.sql}`,
    [userType, ...idClause.params]
  );
}

export async function cleanupDatabaseScope(scope: CleanupScope, options: CleanupOptions = {}): Promise<void> {
  const buildingIds = uniqueNumbers(scope.buildingIds);
  const customerIds = uniqueNumbers(scope.customerIds);
  const staffIds = uniqueNumbers(scope.staffIds);
  const explicitContractIds = uniqueNumbers(scope.contractIds);
  const explicitSaleContractIds = uniqueNumbers(scope.saleContractIds);
  const propertyRequestIds = uniqueNumbers(scope.propertyRequestIds);
  const shouldLog = options.log ?? false;
  const logPrefix = options.logPrefix ?? "[Cleanup]";

  if (
    !buildingIds.length &&
    !customerIds.length &&
    !staffIds.length &&
    !explicitContractIds.length &&
    !explicitSaleContractIds.length &&
    !propertyRequestIds.length &&
    !uniqueStrings(scope.emails).length
  ) {
    if (shouldLog) {
      console.log(`${logPrefix} No matching test data scope to clean.`);
    }
    return;
  }

  const customerEmails = await fetchEmailsForIds("customer", customerIds);
  const staffEmails = await fetchEmailsForIds("staff", staffIds);
  const emails = uniqueStrings([...(scope.emails ?? []), ...customerEmails, ...staffEmails]);
  const contractIds = await fetchContractIds({ buildingIds, customerIds, staffIds, contractIds: explicitContractIds });
  const saleContractIds = await fetchSaleContractIds({
    buildingIds,
    customerIds,
    staffIds,
    saleContractIds: explicitSaleContractIds
  });

  await deleteInvoices(contractIds, customerIds);
  await deleteUtilityMeters(contractIds);

  const propertyRequestFilter = buildOrIdFilter([
    { column: "id", ids: propertyRequestIds },
    { column: "customer_id", ids: customerIds },
    { column: "building_id", ids: buildingIds },
    { column: "processed_by", ids: staffIds },
    { column: "contract_id", ids: contractIds },
    { column: "sale_contract_id", ids: saleContractIds }
  ]);
  if (propertyRequestFilter.params.length > 0) {
    await MySqlDbClient.execute(
      `DELETE FROM property_request WHERE ${propertyRequestFilter.sql}`,
      propertyRequestFilter.params
    );
  }

  const contractFilter = buildOrIdFilter([
    { column: "id", ids: contractIds },
    { column: "customer_id", ids: customerIds },
    { column: "building_id", ids: buildingIds },
    { column: "staff_id", ids: staffIds }
  ]);
  if (contractFilter.params.length > 0) {
    await MySqlDbClient.execute(`DELETE FROM contract WHERE ${contractFilter.sql}`, contractFilter.params);
    await MySqlDbClient.execute(`DELETE FROM sale_contract WHERE ${contractFilter.sql}`, contractFilter.params);
  }

  const assignmentBuildingFilter = buildOrIdFilter([
    { column: "building_id", ids: buildingIds },
    { column: "staff_id", ids: staffIds }
  ]);
  if (assignmentBuildingFilter.params.length > 0) {
    await MySqlDbClient.execute(
      `DELETE FROM assignment_building WHERE ${assignmentBuildingFilter.sql}`,
      assignmentBuildingFilter.params
    );
  }

  const assignmentCustomerFilter = buildOrIdFilter([
    { column: "customer_id", ids: customerIds },
    { column: "staff_id", ids: staffIds }
  ]);
  if (assignmentCustomerFilter.params.length > 0) {
    await MySqlDbClient.execute(
      `DELETE FROM assignment_customer WHERE ${assignmentCustomerFilter.sql}`,
      assignmentCustomerFilter.params
    );
  }

  await deleteRefreshTokens("CUSTOMER", customerIds);
  await deleteRefreshTokens("STAFF", staffIds);
  await deletePasswordResetTokens("CUSTOMER", customerIds);
  await deletePasswordResetTokens("STAFF", staffIds);
  await deleteOauthIdentities("CUSTOMER", customerIds);
  await deleteOauthIdentities("STAFF", staffIds);

  if (buildingIds.length > 0) {
    const buildingClause = buildInClause(buildingIds);
    await MySqlDbClient.execute(`DELETE FROM rent_area WHERE building_id IN ${buildingClause.sql}`, buildingClause.params);
    await MySqlDbClient.execute(`DELETE FROM nearby_amenity WHERE building_id IN ${buildingClause.sql}`, buildingClause.params);
    await MySqlDbClient.execute(`DELETE FROM planning_map WHERE building_id IN ${buildingClause.sql}`, buildingClause.params);
    await MySqlDbClient.execute(`DELETE FROM legal_authority WHERE building_id IN ${buildingClause.sql}`, buildingClause.params);
    await MySqlDbClient.execute(`DELETE FROM supplier WHERE building_id IN ${buildingClause.sql}`, buildingClause.params);
    await MySqlDbClient.execute(`DELETE FROM building WHERE id IN ${buildingClause.sql}`, buildingClause.params);
  }

  if (customerIds.length > 0) {
    const customerClause = buildInClause(customerIds);
    await MySqlDbClient.execute(`DELETE FROM customer WHERE id IN ${customerClause.sql}`, customerClause.params);
  }

  if (staffIds.length > 0) {
    const staffClause = buildInClause(staffIds);
    await MySqlDbClient.execute(`DELETE FROM staff WHERE id IN ${staffClause.sql}`, staffClause.params);
  }

  await deleteEmailVerifications(emails);

  if (shouldLog) {
    console.log(
      `${logPrefix} Cleaned scope: ${buildingIds.length} building(s), ${customerIds.length} customer(s), ${staffIds.length} staff member(s), ${emails.length} email verification bucket(s).`
    );
  }
}
