declare type _contractTest = (accounts: string[]) => void;
declare let contract: ContractFunction;

interface ContractFunction {
  (title: string, fn: (this: any) => void): any;
  (title: string): any;
  only: any;
  skip: any;
}

declare interface TransactionMeta {
  from: string;
}

declare interface Contract<T> {
  "new"(storage: any): Promise<T>;
  deployed(): Promise<T>;
  at(address: string): T;
  address: string;
}

declare interface Artifacts {
  require(name: "MetadataStorage"): Contract<MetadataStorageContractInstance>;
  require(name: "BakerRegistry"): Contract<BakerRegistryContractInstance>;
  require(name: "TokenFA12"): Contract<TokenContractInstance>;
  require(name: "TokenFA2"): Contract<TokenContractInstance>;
  require(name: "TestFactoryFA12"): Contract<FactoryContractInstance>;
  require(name: "TestFactoryFA2"): Contract<FactoryContractInstance>;
  require(name: "DexFA12"): Contract<DexContractInstance>;
  require(name: "DexFA2"): Contract<DexContractInstance>;
  require(name: "Dex"): Contract<DexContractInstance>;
  require(name: "DexFA12"): Contract<DexContractInstance>;
}

declare interface TokenContractInstance {
  address: string;
  transfer(sender: string, receiver: string, amount: number): any;
  approve(spender: string, amount: number): any;
  getBalance(owner: string, contract: any): any;
  getAllowance(owner: string, spender: string, contract: any): any;
  getTotalSupply(unit: any, contract: any): any;
}

declare interface MetadataStorageContractInstance {
  address: string;
  update_storage(storage: any): any;
  update_owners(amount: boolean, spender: string): any;
  get_metadata(contract: any): any;
}
declare interface BakerRegistryContractInstance {
  address: string;
  validate(baker: string): any;
}

declare interface FactoryContractInstance {
  address: string;
  launchExchange(tokenAddress: string, amount: number): any;
  setDexFunction(index: number, func: any): any;
  setTokenFunction(index: number, func: any): any;
}

declare interface DexContractInstance {
  address: string;
  transfer(sender: string, receiver: string, amount: number): any;
  approve(spender: string, amount: number): any;
  getBalance(owner: string, contract: any): any;
  getAllowance(owner: string, spender: string, contract: any): any;
  getTotalSupply(unit: any, contract: any): any;
  use(index: number, funcName: string, ...args: any[]): any;
  default(unit: any): any;
}

declare var artifacts: Artifacts;
declare var tezos: any;
