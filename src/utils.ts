import {con} from "./main";

export function capitalizeFirstLetter(string: string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
  }
  
export function queryPromise(str: string): Promise<any>{ 
  return new Promise((resolve, reject) => {
    con.query(str, (err, result) => {
      if (err) reject(err); 
      resolve(result);
    })
  })
}