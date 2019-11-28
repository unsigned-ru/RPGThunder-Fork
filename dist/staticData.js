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
const main_1 = require("./main");
const utils_1 = require("./utils");
exports.classes = [];
exports.item_types = [];
exports.equipment_slots = [];
exports.item_qualities = [];
function LoadStaticDatabaseData() {
    return __awaiter(this, void 0, void 0, function* () {
        //load classes
        var classQuery = "SELECT * FROM classes";
        main_1.con.query(classQuery, function (err, results) {
            if (err) {
                console.log("Error loading classes from database.");
                console.log(err);
                return;
            }
            results.forEach(function (element) {
                exports.classes.push(element);
            });
            console.log("classes loaded.");
        });
        //load equipment_slots
        var equipment_slotsQuery = "SELECT * FROM equipment_slots";
        main_1.con.query(equipment_slotsQuery, function (err, results) {
            if (err) {
                console.log("Error loading equipment_slots from database.");
                console.log(err);
                return;
            }
            results.forEach(function (element) {
                exports.equipment_slots.push(element);
            });
            console.log("equipment_slots loaded.");
        });
        //load item_types
        var item_typesQuery = "SELECT * FROM item_types";
        main_1.con.query(item_typesQuery, function (err, results) {
            if (err) {
                console.log("Error loading item_types from database.");
                console.log(err);
                return;
            }
            results.forEach(function (element) {
                exports.item_types.push(element);
            });
            console.log("item_types loaded.");
        });
        //load item qualities
        exports.item_qualities = (yield utils_1.queryPromise("SELECT * FROM item_qualities;"));
        console.log("item_qualities loaded.");
    });
}
exports.LoadStaticDatabaseData = LoadStaticDatabaseData;
