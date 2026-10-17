import {getStore} from '@netlify/blobs';
import {createHandler} from '../lib/service.mjs';
let handler;
export default async function(request) {
  if(!handler){
    // Opening the SDK store is lazy; authentication failures do not access stored data.
    let actual;
    const storage=()=>actual||(actual=getStore({name:'diploval-consultations-moderation-v1',region:'eu-central-1',consistency:'strong'}));
    const store={getWithMetadata:(...args)=>storage().getWithMetadata(...args),set:(...args)=>storage().set(...args)};
    handler=createHandler({env:process.env,store});
  }
  return handler(request);
}
