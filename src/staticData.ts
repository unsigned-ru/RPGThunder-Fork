//import Discord from 'discord.js';
import mysql from 'mysql';
import {con} from './main'
import {_class,_item_type,_equipment_slot} from './interfaces';

export var classes: _class[] = [];
export var item_types: _item_type[] = [];
export var equipment_slots: _equipment_slot[] = [];

export function LoadStaticDatabaseData(){
  //load classes
  var classQuery = "SELECT * FROM classes";
  con.query(classQuery, function(err, results){
    if (err)
    {
      console.log("Error loading classes from database.");
      console.log(err);
      return;
    }
    results.forEach(function(element:_class) {
      classes.push(element);
    });
    console.log("classes loaded.");
  });
  //load equipment_slots
  var equipment_slotsQuery = "SELECT * FROM equipment_slots";
  con.query(equipment_slotsQuery, function(err, results: any[]){
    if (err)
    {
      console.log("Error loading equipment_slots from database.");
      console.log(err);
      return;
    }
    
    results.forEach(function(element:_equipment_slot) {
      equipment_slots.push(element);
    });
    console.log("equipment_slots loaded.");
  });
  //load item_types
  var item_typesQuery = "SELECT * FROM item_types";
  con.query(item_typesQuery, function(err, results){
    if (err)
    {
      console.log("Error loading item_types from database.");
      console.log(err);
      return;
    }
    results.forEach(function(element:_item_type) {
      item_types.push(element);
    });
    console.log("item_types loaded.");
  });
}