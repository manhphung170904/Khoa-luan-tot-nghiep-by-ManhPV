export type PaginatedList<T> = {
  content?: T[];
};

export type EntityRecord = {
  id?: number;
  name?: string;
  fullName?: string;
  username?: string;
  customer?: string;
  building?: string;
  month?: number;
  year?: number;
  role?: string;
};

export type TempStaff = { id: number; username: string; fullName: string };
export type TempCustomer = { id: number; username: string; fullName: string; staffId: number };
export type TempBuilding = { id: number; name: string; transactionType: "FOR_RENT" | "FOR_SALE" };

export type TempContract = {
  id: number;
  staff: TempStaff;
  customer: TempCustomer;
  building: TempBuilding;
};

export type TempInvoice = {
  id: number;
  month: number;
  year: number;
  contract: TempContract;
};

export type TempSaleContract = {
  id: number;
  staff: TempStaff;
  customer: TempCustomer;
  building: TempBuilding;
};

export type TempPropertyRequest = {
  id: number;
  buildingId: number;
  customerId: number;
  requestType: "RENT" | "BUY";
};
