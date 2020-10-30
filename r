
> quipuswap@0.0.1 compile /Users/kstasi/Documents/work/quipuswap-core
> node scripts/cli.js build ./main/Dex --no-json -o contracts && truffle compile

./main/Dex built

Compiling your contracts...
===========================
> Compiling ./contracts/main/Dex.tz
> Compiling ./contracts/main/TokenFA2.tz
> Compiling ./contracts/main/Dex.ligo
> Compiling ./contracts/main/Dex.tz
> Compiling ./contracts/main/TokenFA2.ligo
> Compiling ./contracts/main/TokenFA2.tz
> Compiling ./contracts/main/Dex.ligo
> Compiling ./contracts/main/TokenFA2.ligo
> Using entry point "main"
Error(s) occurred while type checking the contract:
Ill typed contract:
  001: { parameter
  002:     (or (pair %balance_of
  003:            (list %requests (pair (address %owner) (nat %token_id)))
  004:            (contract %callback
  005:               (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance)))))
  006:         (list %transfer
  007:            (pair (address %from_)
  008:                  (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount))))))) ;
  009:   storage
  010:     (pair (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  011:                 (pair (option %safelistContract address)
  012:                       (big_map %tokenMetadata
  013:                          nat
  014:                          (pair (nat %token_id)
  015:                                (pair (string %symbol)
  016:                                      (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  017:           (nat %totalSupply)) ;
  018:   code { PUSH nat
  019:               0
  020:          /* [ nat
  021:             : pair (or @parameter
  022:                     (pair %balance_of
  023:                        (list %requests (pair (address %owner) (nat %token_id)))
  024:                        (contract %callback
  025:                           (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance)))))
  026:                     (list %transfer
  027:                        (pair (address %from_)
  028:                              (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount)))))))
  029:                  (pair @storage
  030:                     (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  031:                           (pair (option %safelistContract address)
  032:                                 (big_map %tokenMetadata
  033:                                    nat
  034:                                    (pair (nat %token_id)
  035:                                          (pair (string %symbol)
  036:                                                (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  037:                     (nat %totalSupply)) ] */ ;
  038:          LAMBDA
  039:            (pair address
  040:                  (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  041:                              (pair (option address)
  042:                                    (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  043:                        nat))
  044:            nat
  045:            { /* [ @arg pair address
  046:                      (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  047:                                  (pair (option address)
  048:                                        (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  049:                            nat) ] */
  050:              DUP
  051:              /* [ @arg pair address
  052:                      (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  053:                                  (pair (option address)
  054:                                        (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  055:                            nat)
  056:                 : @arg pair address
  057:                      (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  058:                                  (pair (option address)
  059:                                        (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  060:                            nat) ] */ ;
  061:              CDR
  062:              /* [ pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  063:                            (pair (option address)
  064:                                  (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  065:                      nat
  066:                 : @arg pair address
  067:                      (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  068:                                  (pair (option address)
  069:                                        (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  070:                            nat) ] */ ;
  071:              CAR
  072:              /* [ pair (pair (big_map address nat) (big_map (pair address address) unit))
  073:                      (pair (option address)
  074:                            (big_map nat (pair nat (pair string (pair string (pair nat (map string string)))))))
  075:                 : @arg pair address
  076:                      (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  077:                                  (pair (option address)
  078:                                        (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  079:                            nat) ] */ ;
  080:              CAR
  081:              /* [ pair (big_map address nat) (big_map (pair address address) unit)
  082:                 : @arg pair address
  083:                      (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  084:                                  (pair (option address)
  085:                                        (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  086:                            nat) ] */ ;
  087:              CAR
  088:              /* [ big_map address nat
  089:                 : @arg pair address
  090:                      (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  091:                                  (pair (option address)
  092:                                        (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  093:                            nat) ] */ ;
  094:              SWAP
  095:              /* [ @arg pair address
  096:                      (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  097:                                  (pair (option address)
  098:                                        (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  099:                            nat) : big_map address nat ] */ ;
  100:              CAR
  101:              /* [ address : big_map address nat ] */ ;
  102:              GET
  103:              /* [ option nat ] */ ;
  104:              IF_NONE { /* [] */ PUSH nat 0 /* [ nat ] */ } { /* [ @some nat ] */ } }
  105:          /* [ lambda
  106:               (pair address
  107:                     (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  108:                                 (pair (option address)
  109:                                       (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  110:                           nat))
  111:               nat : nat
  112:             : pair (or @parameter
  113:                     (pair %balance_of
  114:                        (list %requests (pair (address %owner) (nat %token_id)))
  115:                        (contract %callback
  116:                           (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance)))))
  117:                     (list %transfer
  118:                        (pair (address %from_)
  119:                              (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount)))))))
  120:                  (pair @storage
  121:                     (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  122:                           (pair (option %safelistContract address)
  123:                                 (big_map %tokenMetadata
  124:                                    nat
  125:                                    (pair (nat %token_id)
  126:                                          (pair (string %symbol)
  127:                                                (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  128:                     (nat %totalSupply)) ] */ ;
  129:          DIG 2
  130:          /* [ pair (or @parameter
  131:                     (pair %balance_of
  132:                        (list %requests (pair (address %owner) (nat %token_id)))
  133:                        (contract %callback
  134:                           (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance)))))
  135:                     (list %transfer
  136:                        (pair (address %from_)
  137:                              (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount)))))))
  138:                  (pair @storage
  139:                     (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  140:                           (pair (option %safelistContract address)
  141:                                 (big_map %tokenMetadata
  142:                                    nat
  143:                                    (pair (nat %token_id)
  144:                                          (pair (string %symbol)
  145:                                                (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  146:                     (nat %totalSupply))
  147:             : lambda
  148:               (pair address
  149:                     (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  150:                                 (pair (option address)
  151:                                       (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  152:                           nat))
  153:               nat : nat ] */ ;
  154:          DUP
  155:          /* [ pair (or @parameter
  156:                     (pair %balance_of
  157:                        (list %requests (pair (address %owner) (nat %token_id)))
  158:                        (contract %callback
  159:                           (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance)))))
  160:                     (list %transfer
  161:                        (pair (address %from_)
  162:                              (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount)))))))
  163:                  (pair @storage
  164:                     (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  165:                           (pair (option %safelistContract address)
  166:                                 (big_map %tokenMetadata
  167:                                    nat
  168:                                    (pair (nat %token_id)
  169:                                          (pair (string %symbol)
  170:                                                (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  171:                     (nat %totalSupply))
  172:             : pair (or @parameter
  173:                     (pair %balance_of
  174:                        (list %requests (pair (address %owner) (nat %token_id)))
  175:                        (contract %callback
  176:                           (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance)))))
  177:                     (list %transfer
  178:                        (pair (address %from_)
  179:                              (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount)))))))
  180:                  (pair @storage
  181:                     (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  182:                           (pair (option %safelistContract address)
  183:                                 (big_map %tokenMetadata
  184:                                    nat
  185:                                    (pair (nat %token_id)
  186:                                          (pair (string %symbol)
  187:                                                (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  188:                     (nat %totalSupply))
  189:             : lambda
  190:               (pair address
  191:                     (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  192:                                 (pair (option address)
  193:                                       (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  194:                           nat))
  195:               nat : nat ] */ ;
  196:          DUG 3
  197:          /* [ pair (or @parameter
  198:                     (pair %balance_of
  199:                        (list %requests (pair (address %owner) (nat %token_id)))
  200:                        (contract %callback
  201:                           (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance)))))
  202:                     (list %transfer
  203:                        (pair (address %from_)
  204:                              (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount)))))))
  205:                  (pair @storage
  206:                     (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  207:                           (pair (option %safelistContract address)
  208:                                 (big_map %tokenMetadata
  209:                                    nat
  210:                                    (pair (nat %token_id)
  211:                                          (pair (string %symbol)
  212:                                                (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  213:                     (nat %totalSupply))
  214:             : lambda
  215:               (pair address
  216:                     (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  217:                                 (pair (option address)
  218:                                       (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  219:                           nat))
  220:               nat : nat
  221:             : pair (or @parameter
  222:                     (pair %balance_of
  223:                        (list %requests (pair (address %owner) (nat %token_id)))
  224:                        (contract %callback
  225:                           (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance)))))
  226:                     (list %transfer
  227:                        (pair (address %from_)
  228:                              (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount)))))))
  229:                  (pair @storage
  230:                     (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  231:                           (pair (option %safelistContract address)
  232:                                 (big_map %tokenMetadata
  233:                                    nat
  234:                                    (pair (nat %token_id)
  235:                                          (pair (string %symbol)
  236:                                                (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  237:                     (nat %totalSupply)) ] */ ;
  238:          CDR
  239:          /* [ @storage pair (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  240:                        (pair (option %safelistContract address)
  241:                              (big_map %tokenMetadata
  242:                                 nat
  243:                                 (pair (nat %token_id)
  244:                                       (pair (string %symbol)
  245:                                             (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  246:                  (nat %totalSupply)
  247:             : lambda
  248:               (pair address
  249:                     (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  250:                                 (pair (option address)
  251:                                       (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  252:                           nat))
  253:               nat : nat
  254:             : pair (or @parameter
  255:                     (pair %balance_of
  256:                        (list %requests (pair (address %owner) (nat %token_id)))
  257:                        (contract %callback
  258:                           (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance)))))
  259:                     (list %transfer
  260:                        (pair (address %from_)
  261:                              (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount)))))))
  262:                  (pair @storage
  263:                     (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  264:                           (pair (option %safelistContract address)
  265:                                 (big_map %tokenMetadata
  266:                                    nat
  267:                                    (pair (nat %token_id)
  268:                                          (pair (string %symbol)
  269:                                                (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  270:                     (nat %totalSupply)) ] */ ;
  271:          DIG 3
  272:          /* [ pair (or @parameter
  273:                     (pair %balance_of
  274:                        (list %requests (pair (address %owner) (nat %token_id)))
  275:                        (contract %callback
  276:                           (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance)))))
  277:                     (list %transfer
  278:                        (pair (address %from_)
  279:                              (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount)))))))
  280:                  (pair @storage
  281:                     (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  282:                           (pair (option %safelistContract address)
  283:                                 (big_map %tokenMetadata
  284:                                    nat
  285:                                    (pair (nat %token_id)
  286:                                          (pair (string %symbol)
  287:                                                (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  288:                     (nat %totalSupply))
  289:             : @storage pair (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  290:                        (pair (option %safelistContract address)
  291:                              (big_map %tokenMetadata
  292:                                 nat
  293:                                 (pair (nat %token_id)
  294:                                       (pair (string %symbol)
  295:                                             (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  296:                  (nat %totalSupply)
  297:             : lambda
  298:               (pair address
  299:                     (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  300:                                 (pair (option address)
  301:                                       (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  302:                           nat))
  303:               nat : nat ] */ ;
  304:          CAR
  305:          /* [ @parameter or (pair %balance_of
  306:                   (list %requests (pair (address %owner) (nat %token_id)))
  307:                   (contract %callback
  308:                      (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance)))))
  309:                (list %transfer
  310:                   (pair (address %from_)
  311:                         (list %txs (pair (address %to_) (pair (nat %token_id) (nat %amount))))))
  312:             : @storage pair (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  313:                        (pair (option %safelistContract address)
  314:                              (big_map %tokenMetadata
  315:                                 nat
  316:                                 (pair (nat %token_id)
  317:                                       (pair (string %symbol)
  318:                                             (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  319:                  (nat %totalSupply)
  320:             : lambda
  321:               (pair address
  322:                     (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  323:                                 (pair (option address)
  324:                                       (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  325:                           nat))
  326:               nat : nat ] */ ;
  327:          IF_LEFT
  328:            { SWAP
  329:              /* [ @storage pair (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  330:                            (pair (option %safelistContract address)
  331:                                  (big_map %tokenMetadata
  332:                                     nat
  333:                                     (pair (nat %token_id)
  334:                                           (pair (string %symbol)
  335:                                                 (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  336:                      (nat %totalSupply)
  337:                 : @parameter.balance_of pair (list %requests (pair (address %owner) (nat %token_id)))
  338:                      (contract %callback
  339:                         (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance))))
  340:                 : lambda
  341:                   (pair address
  342:                         (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  343:                                     (pair (option address)
  344:                                           (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  345:                               nat))
  346:                   nat : nat ] */ ;
  347:              DUP
  348:              /* [ @storage pair (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  349:                            (pair (option %safelistContract address)
  350:                                  (big_map %tokenMetadata
  351:                                     nat
  352:                                     (pair (nat %token_id)
  353:                                           (pair (string %symbol)
  354:                                                 (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  355:                      (nat %totalSupply)
  356:                 : @storage pair (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  357:                            (pair (option %safelistContract address)
  358:                                  (big_map %tokenMetadata
  359:                                     nat
  360:                                     (pair (nat %token_id)
  361:                                           (pair (string %symbol)
  362:                                                 (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  363:                      (nat %totalSupply)
  364:                 : @parameter.balance_of pair (list %requests (pair (address %owner) (nat %token_id)))
  365:                      (contract %callback
  366:                         (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance))))
  367:                 : lambda
  368:                   (pair address
  369:                         (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  370:                                     (pair (option address)
  371:                                           (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  372:                               nat))
  373:                   nat : nat ] */ ;
  374:              DIG 2
  375:              /* [ @parameter.balance_of pair (list %requests (pair (address %owner) (nat %token_id)))
  376:                      (contract %callback
  377:                         (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance))))
  378:                 : @storage pair (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  379:                            (pair (option %safelistContract address)
  380:                                  (big_map %tokenMetadata
  381:                                     nat
  382:                                     (pair (nat %token_id)
  383:                                           (pair (string %symbol)
  384:                                                 (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  385:                      (nat %totalSupply)
  386:                 : @storage pair (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  387:                            (pair (option %safelistContract address)
  388:                                  (big_map %tokenMetadata
  389:                                     nat
  390:                                     (pair (nat %token_id)
  391:                                           (pair (string %symbol)
  392:                                                 (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  393:                      (nat %totalSupply)
  394:                 : lambda
  395:                   (pair address
  396:                         (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  397:                                     (pair (option address)
  398:                                           (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  399:                               nat))
  400:                   nat : nat ] */ ;
  401:              PAIR
  402:              /* [ pair (pair @parameter.balance_of
  403:                         (list %requests (pair (address %owner) (nat %token_id)))
  404:                         (contract %callback
  405:                            (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance)))))
  406:                      (pair @storage
  407:                         (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  408:                               (pair (option %safelistContract address)
  409:                                     (big_map %tokenMetadata
  410:                                        nat
  411:                                        (pair (nat %token_id)
  412:                                              (pair (string %symbol)
  413:                                                    (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  414:                         (nat %totalSupply))
  415:                 : @storage pair (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  416:                            (pair (option %safelistContract address)
  417:                                  (big_map %tokenMetadata
  418:                                     nat
  419:                                     (pair (nat %token_id)
  420:                                           (pair (string %symbol)
  421:                                                 (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  422:                      (nat %totalSupply)
  423:                 : lambda
  424:                   (pair address
  425:                         (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  426:                                     (pair (option address)
  427:                                           (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  428:                               nat))
  429:                   nat : nat ] */ ;
  430:              DUP
  431:              /* [ pair (pair @parameter.balance_of
  432:                         (list %requests (pair (address %owner) (nat %token_id)))
  433:                         (contract %callback
  434:                            (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance)))))
  435:                      (pair @storage
  436:                         (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  437:                               (pair (option %safelistContract address)
  438:                                     (big_map %tokenMetadata
  439:                                        nat
  440:                                        (pair (nat %token_id)
  441:                                              (pair (string %symbol)
  442:                                                    (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  443:                         (nat %totalSupply))
  444:                 : pair (pair @parameter.balance_of
  445:                         (list %requests (pair (address %owner) (nat %token_id)))
  446:                         (contract %callback
  447:                            (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance)))))
  448:                      (pair @storage
  449:                         (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  450:                               (pair (option %safelistContract address)
  451:                                     (big_map %tokenMetadata
  452:                                        nat
  453:                                        (pair (nat %token_id)
  454:                                              (pair (string %symbol)
  455:                                                    (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  456:                         (nat %totalSupply))
  457:                 : @storage pair (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  458:                            (pair (option %safelistContract address)
  459:                                  (big_map %tokenMetadata
  460:                                     nat
  461:                                     (pair (nat %token_id)
  462:                                           (pair (string %symbol)
  463:                                                 (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  464:                      (nat %totalSupply)
  465:                 : lambda
  466:                   (pair address
  467:                         (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  468:                                     (pair (option address)
  469:                                           (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  470:                               nat))
  471:                   nat : nat ] */ ;
  472:              CAR
  473:              /* [ @parameter.balance_of pair (list %requests (pair (address %owner) (nat %token_id)))
  474:                      (contract %callback
  475:                         (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance))))
  476:                 : pair (pair @parameter.balance_of
  477:                         (list %requests (pair (address %owner) (nat %token_id)))
  478:                         (contract %callback
  479:                            (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance)))))
  480:                      (pair @storage
  481:                         (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  482:                               (pair (option %safelistContract address)
  483:                                     (big_map %tokenMetadata
  484:                                        nat
  485:                                        (pair (nat %token_id)
  486:                                              (pair (string %symbol)
  487:                                                    (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  488:                         (nat %totalSupply))
  489:                 : @storage pair (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  490:                            (pair (option %safelistContract address)
  491:                                  (big_map %tokenMetadata
  492:                                     nat
  493:                                     (pair (nat %token_id)
  494:                                           (pair (string %symbol)
  495:                                                 (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  496:                      (nat %totalSupply)
  497:                 : lambda
  498:                   (pair address
  499:                         (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  500:                                     (pair (option address)
  501:                                           (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  502:                               nat))
  503:                   nat : nat ] */ ;
  504:              NIL (pair (pair address nat) nat)
  505:              /* [ list (pair (pair address nat) nat)
  506:                 : @parameter.balance_of pair (list %requests (pair (address %owner) (nat %token_id)))
  507:                      (contract %callback
  508:                         (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance))))
  509:                 : pair (pair @parameter.balance_of
  510:                         (list %requests (pair (address %owner) (nat %token_id)))
  511:                         (contract %callback
  512:                            (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance)))))
  513:                      (pair @storage
  514:                         (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  515:                               (pair (option %safelistContract address)
  516:                                     (big_map %tokenMetadata
  517:                                        nat
  518:                                        (pair (nat %token_id)
  519:                                              (pair (string %symbol)
  520:                                                    (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  521:                         (nat %totalSupply))
  522:                 : @storage pair (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  523:                            (pair (option %safelistContract address)
  524:                                  (big_map %tokenMetadata
  525:                                     nat
  526:                                     (pair (nat %token_id)
  527:                                           (pair (string %symbol)
  528:                                                 (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  529:                      (nat %totalSupply)
  530:                 : lambda
  531:                   (pair address
  532:                         (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  533:                                     (pair (option address)
  534:                                           (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  535:                               nat))
  536:                   nat : nat ] */ ;
  537:              SWAP
  538:              /* [ @parameter.balance_of pair (list %requests (pair (address %owner) (nat %token_id)))
  539:                      (contract %callback
  540:                         (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance))))
  541:                 : list (pair (pair address nat) nat)
  542:                 : pair (pair @parameter.balance_of
  543:                         (list %requests (pair (address %owner) (nat %token_id)))
  544:                         (contract %callback
  545:                            (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance)))))
  546:                      (pair @storage
  547:                         (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  548:                               (pair (option %safelistContract address)
  549:                                     (big_map %tokenMetadata
  550:                                        nat
  551:                                        (pair (nat %token_id)
  552:                                              (pair (string %symbol)
  553:                                                    (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  554:                         (nat %totalSupply))
  555:                 : @storage pair (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  556:                            (pair (option %safelistContract address)
  557:                                  (big_map %tokenMetadata
  558:                                     nat
  559:                                     (pair (nat %token_id)
  560:                                           (pair (string %symbol)
  561:                                                 (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  562:                      (nat %totalSupply)
  563:                 : lambda
  564:                   (pair address
  565:                         (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  566:                                     (pair (option address)
  567:                                           (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  568:                               nat))
  569:                   nat : nat ] */ ;
  570:              DUP
  571:              /* [ @parameter.balance_of pair (list %requests (pair (address %owner) (nat %token_id)))
  572:                      (contract %callback
  573:                         (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance))))
  574:                 : @parameter.balance_of pair (list %requests (pair (address %owner) (nat %token_id)))
  575:                      (contract %callback
  576:                         (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance))))
  577:                 : list (pair (pair address nat) nat)
  578:                 : pair (pair @parameter.balance_of
  579:                         (list %requests (pair (address %owner) (nat %token_id)))
  580:                         (contract %callback
  581:                            (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance)))))
  582:                      (pair @storage
  583:                         (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  584:                               (pair (option %safelistContract address)
  585:                                     (big_map %tokenMetadata
  586:                                        nat
  587:                                        (pair (nat %token_id)
  588:                                              (pair (string %symbol)
  589:                                                    (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  590:                         (nat %totalSupply))
  591:                 : @storage pair (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  592:                            (pair (option %safelistContract address)
  593:                                  (big_map %tokenMetadata
  594:                                     nat
  595:                                     (pair (nat %token_id)
  596:                                           (pair (string %symbol)
  597:                                                 (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  598:                      (nat %totalSupply)
  599:                 : lambda
  600:                   (pair address
  601:                         (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  602:                                     (pair (option address)
  603:                                           (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  604:                               nat))
  605:                   nat : nat ] */ ;
  606:              DUG 2
  607:              /* [ @parameter.balance_of pair (list %requests (pair (address %owner) (nat %token_id)))
  608:                      (contract %callback
  609:                         (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance))))
  610:                 : list (pair (pair address nat) nat)
  611:                 : @parameter.balance_of pair (list %requests (pair (address %owner) (nat %token_id)))
  612:                      (contract %callback
  613:                         (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance))))
  614:                 : pair (pair @parameter.balance_of
  615:                         (list %requests (pair (address %owner) (nat %token_id)))
  616:                         (contract %callback
  617:                            (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance)))))
  618:                      (pair @storage
  619:                         (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  620:                               (pair (option %safelistContract address)
  621:                                     (big_map %tokenMetadata
  622:                                        nat
  623:                                        (pair (nat %token_id)
  624:                                              (pair (string %symbol)
  625:                                                    (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  626:                         (nat %totalSupply))
  627:                 : @storage pair (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  628:                            (pair (option %safelistContract address)
  629:                                  (big_map %tokenMetadata
  630:                                     nat
  631:                                     (pair (nat %token_id)
  632:                                           (pair (string %symbol)
  633:                                                 (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  634:                      (nat %totalSupply)
  635:                 : lambda
  636:                   (pair address
  637:                         (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  638:                                     (pair (option address)
  639:                                           (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  640:                               nat))
  641:                   nat : nat ] */ ;
  642:              CDR
  643:              /* [ contract (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance)))
  644:                 : list (pair (pair address nat) nat)
  645:                 : @parameter.balance_of pair (list %requests (pair (address %owner) (nat %token_id)))
  646:                      (contract %callback
  647:                         (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance))))
  648:                 : pair (pair @parameter.balance_of
  649:                         (list %requests (pair (address %owner) (nat %token_id)))
  650:                         (contract %callback
  651:                            (list (pair (pair %request (address %owner) (nat %token_id)) (nat %balance)))))
  652:                      (pair @storage
  653:                         (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  654:                               (pair (option %safelistContract address)
  655:                                     (big_map %tokenMetadata
  656:                                        nat
  657:                                        (pair (nat %token_id)
  658:                                              (pair (string %symbol)
  659:                                                    (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  660:                         (nat %totalSupply))
  661:                 : @storage pair (pair (pair (big_map %ledger address nat) (big_map %operators (pair address address) unit))
  662:                            (pair (option %safelistContract address)
  663:                                  (big_map %tokenMetadata
  664:                                     nat
  665:                                     (pair (nat %token_id)
  666:                                           (pair (string %symbol)
  667:                                                 (pair (string %name) (pair (nat %decimals) (map %extras string string))))))))
  668:                      (nat %totalSupply)
  669:                 : lambda
  670:                   (pair address
  671:                         (pair (pair (pair (big_map address nat) (big_map (pair address address) unit))
  672:                                     (pair (option address)
  673:                                           (big_map nat (pair nat (pair string (pair string (pair nat (map string string))))))))
  674:                               nat))
  675:                   nat : nat ] */ ;
  676:              ITER { SWAP ;
  677:                     PAIR ;
  678:                     DUP ;
  679:                     CDR ;
  680:                     DUP ;
  681:                     CDR ;
  682:                     DIG 7 ;
  683:                     DUP ;
  684:                     DUG 8 ;
  685:                     COMPARE ;
  686:                     NEQ ;
  687:                     IF { PUSH string "FA2_TOKEN_UNDEFINED" ; FAILWITH } { PUSH unit Unit } ;
  688:                     DROP ;
  689:                     DIG 3 ;
  690:                     DUP ;
  691:                     DUG 4 ;
  692:                     CDR ;
  693:                     SWAP ;
  694:                     DUP ;
  695:                     DUG 2 ;
  696:                     CAR ;
  697:                     PAIR ;
  698:                     DIG 6 ;
  699:                     DUP ;
  700:                     DUG 7 ;
  701:                     SWAP ;
  702:                     EXEC ;
  703:                     PAIR ;
  704:                     SWAP ;
  705:                     CAR ;
  706:                     SWAP ;
  707:                     DUP ;
  708:                     DUG 2 ;
  709:                     CAR ;
  710:                     DIG 2 ;
  711:                     CDR ;
  712:                     PAIR ;
  713:                     CONS } ;
  714:              DIG 2 ;
  715:              DROP ;
  716:              DIG 3 ;
  717:              DROP ;
  718:              DIG 3 ;
  719:              DROP ;
  720:              NIL operation ;
  721:              DIG 2 ;
  722:              CAR ;
  723:              PUSH mutez 0 ;
  724:              DIG 3 ;
  725:              TRANSFER_TOKENS ;
  726:              CONS ;
  727:              PAIR }
  728:            { ITER { SWAP ;
  729:                     DUP ;
  730:                     DUG 2 ;
  731:                     SWAP ;
  732:                     DUP ;
  733:                     DUG 2 ;
  734:                     CAR ;
  735:                     PAIR ;
  736:                     DIG 3 ;
  737:                     DUP ;
  738:                     DUG 4 ;
  739:                     SWAP ;
  740:                     EXEC ;
  741:                     DUG 2 ;
  742:                     DUP ;
  743:                     DUG 3 ;
  744:                     CDR ;
  745:                     ITER { DUP ;
  746:                            CDR ;
  747:                            CAR ;
  748:                            SWAP ;
  749:                            DUP ;
  750:                            DUG 2 ;
  751:                            CAR ;
  752:                            DIG 2 ;
  753:                            CDR ;
  754:                            CDR ;
  755:                            PAIR ;
  756:                            PAIR ;
  757:                            DUP ;
  758:                            CDR ;
  759:                            DIG 6 ;
  760:                            DUP ;
  761:                            DUG 7 ;
  762:                            COMPARE ;
  763:                            NEQ ;
  764:                            IF { PUSH string "FA2_TOKEN_UNDEFINED" ; FAILWITH } { PUSH unit Unit } ;
  765:                            DROP ;
  766:                            DUP ;
  767:                            CAR ;
  768:                            CAR ;
  769:                            DIG 3 ;
  770:                            DUP ;
  771:                            DUG 4 ;
  772:                            COMPARE ;
  773:                            LT ;
  774:                            IF { PUSH string "FA2_INSUFFICIENT_BALANCE" ; FAILWITH } { PUSH unit Unit } ;
  775:                            DROP ;
  776:                            DUP ;
  777:                            CAR ;
  778:                            CAR ;
  779:                            DIG 3 ;
  780:                            DUP ;
  781:                            DUG 4 ;
  782:                            SUB ;
  783:                            ABS ;
  784:                            DIG 2 ;
  785:                            DUP ;
  786:                            CAR ;
  787:                            CAR ;
  788:                            CAR ;
  789:                            DIG 2 ;
  790:                            DIG 5 ;
  791:                            DUP ;
  792:                            DUG 6 ;
  793:                            CAR ;
  794:                            SWAP ;
  795:                            SOME ;
  796:                            SWAP ;
  797:                            UPDATE ;
  798:                            DIP { DUP ; CDR ; SWAP ; CAR ; DUP ; CDR ; SWAP ; CAR ; CDR } ;
  799:                            PAIR ;
  800:                            PAIR ;
  801:                            PAIR ;
  802:                            DUP ;
  803:                            DIG 2 ;
  804:                            DUP ;
  805:                            DUG 3 ;
  806:                            CAR ;
  807:                            CDR ;
  808:                            PAIR ;
  809:                            DIG 5 ;
  810:                            DUP ;
  811:                            DUG 6 ;
  812:                            SWAP ;
  813:                            EXEC ;
  814:                            DIG 2 ;
  815:                            DUP ;
  816:                            DUG 3 ;
  817:                            CAR ;
  818:                            CAR ;
  819:                            ADD ;
  820:                            SWAP ;
  821:                            DUP ;
  822:                            CAR ;
  823:                            CAR ;
  824:                            CAR ;
  825:                            DIG 2 ;
  826:                            DIG 3 ;
  827:                            CAR ;
  828:                            CDR ;
  829:                            SWAP ;
  830:                            SOME ;
  831:                            SWAP ;
  832:                            UPDATE ;
  833:                            DIP { DUP ; CDR ; SWAP ; CAR ; DUP ; CDR ; SWAP ; CAR ; CDR } ;
  834:                            PAIR ;
  835:                            PAIR ;
  836:                            PAIR } ;
  837:                     SWAP ;
  838:                     DROP ;
  839:                     SWAP ;
  840:                     DROP } ;
  841:              SWAP ;
  842:              DROP ;
  843:              SWAP ;
  844:              DROP ;
  845:              NIL operation ;
  846:              PAIR } } }
From line 676 character 13 to line 713 character 26,
invalid primitive ITER, only DROP, DUP, DIG, DUG, SWAP, SOME, UNIT, PAIR,
CAR, CDR, CONS, MEM, UPDATE, MAP, ITER, GET, EXEC, FAILWITH, SIZE, CONCAT,
ADD, SUB, MUL, EDIV, OR, AND, XOR, NOT, ABS, INT, NEG, LSL, LSR, COMPARE, EQ,
NEQ, LT, GT, LE, GE, TRANSFER_TOKENS, CREATE_ACCOUNT, CREATE_CONTRACT, NOW,
AMOUNT, BALANCE, IMPLICIT_ACCOUNT, CHECK_SIGNATURE, BLAKE2B, SHA256, SHA512,
HASH_KEY, STEPS_TO_QUOTA, PUSH, NONE, LEFT, RIGHT, NIL, EMPTY_SET, DIP, LOOP,
IF_NONE, IF_LEFT, IF_CONS, EMPTY_MAP, EMPTY_BIG_MAP, IF, SOURCE, SENDER, SELF
or LAMBDA can be used here.

[31mCompilation of /Users/kstasi/Documents/work/quipuswap-core/contracts/main/TokenFA2.ligo failed. See above.[39m
Truffle v5.5.0-tezos.4 (core: 5.5.0-tezos.4)
Node v12.18.1
