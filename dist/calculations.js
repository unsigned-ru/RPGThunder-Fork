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
function getUserStats(id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            var stats = new interfaces_js_1._user_stats();
            //Get userClassID & user_Equipment & currentHP
            var sql = `SELECT class_id FROM users WHERE user_id='${id}';` +
                `SELECT main_hand,off_hand,head,chest,legs,feet,trinket FROM user_equipment WHERE user_id='${id}';` +
                `SELECT current_hp,level FROM user_stats WHERE user_id='${id}'`;
            var query = yield utils_1.queryPromise(sql);
            if (query[0][0].length == 0)
                return undefined;
            var selectedClass = staticData_1.classes.find(x => x.id == query[0][0].class_id);
            stats.level = query[2][0].level;
            stats.hp = query[2][0].current_hp;
            stats.base_atk = selectedClass.base_atk;
            stats.base_def = selectedClass.base_def;
            stats.base_acc = selectedClass.base_acc;
            var sql = `SELECT atk, def, acc FROM items WHERE id=${query[1][0].main_hand} OR id=${query[1][0].off_hand} OR id=${query[1][0].head} OR id=${query[1][0].chest} OR id=${query[1][0].legs} OR id=${query[1][0].feet} OR id=${query[1][0].trinket};`;
            var query = yield utils_1.queryPromise(sql);
            query.forEach(function (element) {
                stats.equipment_atk += element.atk;
                stats.equipment_def += element.def;
                stats.equipment_acc += element.acc;
            });
            stats.max_hp = selectedClass.base_hp + ((stats.level - 1) * selectedClass.hp_increase);
            stats.total_atk = stats.base_atk + stats.equipment_atk + ((stats.level - 1) * selectedClass.atk_increase);
            stats.total_def = stats.base_def + stats.equipment_def + ((stats.level - 1) * selectedClass.def_increase);
            stats.total_acc = stats.base_acc + stats.equipment_acc + ((stats.level - 1) * selectedClass.acc_increase);
            console.log(stats);
            return stats;
        }
        catch (err) {
            console.log(err);
        }
    });
}
exports.getUserStats = getUserStats;
function calculateReqExp(level) {
    return Math.round(config_json_1.exp_req_base_exp + (config_json_1.exp_req_base_exp * ((Math.pow(level, config_json_1.exp_req_multiplier)) - level)));
}
exports.calculateReqExp = calculateReqExp;
