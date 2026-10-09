export const VIN_REGEX=/^[A-HJ-NPR-Z0-9]{17}$/;
export const normalizeVin=(s:string)=>s.trim().toUpperCase();
export const parseVin=(s:string)=>{const vin=normalizeVin(s);return VIN_REGEX.test(vin)?vin:null;};
