"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const main_1 = require("./main");
exports.classes = [];
exports.item_types = [];
exports.equipment_slots = [];
function LoadStaticDatabaseData() {
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
}
exports.LoadStaticDatabaseData = LoadStaticDatabaseData;
