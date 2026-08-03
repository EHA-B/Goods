import { activityLogsMock } from "./activityLogsMock";
export const activityLogsService = {
 async list(){ await new Promise((resolve)=>setTimeout(resolve,180)); return [...activityLogsMock]; },
 async get(id:number){ await new Promise((resolve)=>setTimeout(resolve,100)); return activityLogsMock.find((item)=>item.id===id); }
};
