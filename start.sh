#!/bin/bash

declare empty_node_container=false

while getopts "e" opt; do
    case ${opt} in
        e ) empty_node_container=true;;
        \? )
            printf "Invalid Option: -${OPTARG}\n" 1>&2
            exit 1
        ;;
    esac
done
shift $((OPTIND -1))


if [[ $empty_node_container == "true" ]]; then
    docker run  -it --rm \
                --user 1000:1000 \
                --workdir /app \
                --volume $(pwd):/app \
                --name running-chan-parser-empty \
                node bash
                
else
    sudo -H -u \#1000 bash -c "mkdir -p /dev/shm/chan_parser"
    docker run  -it --rm \
                --user 1000:1000 \
                --volume $(pwd):/app \
                --volume /dev/shm/chan_parser:/home/node/output \
                --name running-chan-parser \
                --publish 127.0.0.1:8080:8080 \
                chan-parser
fi