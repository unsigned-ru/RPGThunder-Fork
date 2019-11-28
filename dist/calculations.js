"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_json_1 = require("./config.json");
const utils_1 = require("./utils");
const interfaces_js_1 = require("./interfaces.js");
const staticData_1 = require("./staticData");
function getUserData(id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            var data = new interfaces_js_1._user_data();
            //Get userClassID & user_Equipment & currentHP
            var sql = `SELECT class_id FROM users WHERE user_id='${id}';` +
                `SELECT main_hand,off_hand,head,chest,legs,feet,trinket FROM user_equipment WHERE user_id='${id}';` +
                `SELECT current_hp,level,exp,currency FROM user_stats WHERE user_id='${id}'`;
            var query = yield utils_1.queryPromise(sql);
            if (query[0].length == 0)
                throw "User is not registered.";
            data.class = staticData_1.classes.find(x => x.id == query[0][0].class_id);
            data.level = query[2][0].level;
            data.exp = query[2][0].exp;
            data.currency = query[2][0].currency;
            data.current_hp = query[2][0].current_hp;
            data.base_atk = data.class.base_atk;
            data.base_def = data.class.base_def;
            data.base_acc = data.class.base_acc;
            var sql = `SELECT * FROM items WHERE id=${query[1][0].main_hand} OR id=${query[1][0].off_hand} OR id=${query[1][0].head} OR id=${query[1][0].chest} OR id=${query[1][0].legs} OR id=${query[1][0].feet} OR id=${query[1][0].trinket};`;
            var query = yield utils_1.queryPromise(sql);
            query.forEach(function (element) {
                data.equipment_atk += element.atk;
                data.equipment_def += element.def;
                data.equipment_acc += element.acc;
                console.log(staticData_1.equipment_slots.find(slot => slot.id == element.slot).name);
                switch (staticData_1.equipment_slots.find(slot => slot.id == element.slot).name.toLowerCase()) {
                    case "main hand":
                        data.main_hand = element;
                        break;
                    case "off hand":
                        data.off_hand = element;
                        break;
                    case "head":
                        data.head = element;
                        break;
                    case "legs":
                        data.legs = element;
                        break;
                    case "feet":
                        data.feet = element;
                        break;
                    case "trinket":
                        data.trinket = element;
                        break;
                }
            });
            data.max_hp = data.class.base_hp + ((data.level - 1) * data.class.hp_increase);
            data.total_atk = data.base_atk + data.equipment_atk + ((data.level - 1) * data.class.atk_increase);
            data.total_def = data.base_def + data.equipment_def + ((data.level - 1) * data.class.def_increase);
            data.total_acc = data.base_acc + data.equipment_acc + ((data.level - 1) * data.class.acc_increase);
            return data;
        }
        catch (err) {
            throw err;
        }
    });
}
exports.getUserData = getUserData;
function calculateReqExp(level) {
    return Math.round(config_json_1.exp_req_base_exp + (config_json_1.exp_req_base_exp * ((Math.pow(level, config_json_1.exp_req_multiplier)) - level)));
}
exports.calculateReqExp = calculateReqExp;
function getInventory(user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            var inventoryResult = yield utils_1.queryPromise(`SELECT item FROM user_inventory WHERE user_id=${user_id}`);
            if (inventoryResult.length == 0 || undefined) {
                throw "No items found.";
            }
            var itemQuery = "SELECT * FROM items WHERE ";
            var firstDone = false;
            inventoryResult.forEach(row => {
                if (!firstDone) {
                    itemQuery += `id=${row.item} `;
                    firstDone = true;
                }
                else {
                    itemQuery += `OR id=${row.item} `;
                }
            });
            itemQuery += ";";
            var inventory = yield utils_1.queryPromise(itemQuery);
            return inventory;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    });
}
exports.getInventory = getInventory;
