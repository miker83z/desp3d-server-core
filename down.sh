#!/bin/bash

for i in {1..4}
do 
  docker container stop auth_$i
  docker container rm auth_$i
done

killall node
rm nohup.out