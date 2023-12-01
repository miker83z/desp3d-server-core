#!/bin/bash

RPCNODE_PORT=8545 

for i in {1..4}
do 
  docker run --name auth_$i -p 802$i:802$i -e AUTH_API_PORT="802$i" -d miker83z/umbral-rs-web-service:latest
  export NODE_PORT="316$i" 
  export AUTH_PORT="802$i"
  nohup npm run dev &
done 

tail -f nohup.out