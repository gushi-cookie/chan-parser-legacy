# ChanParser - image boards parser.
ChanParser is a tool for parsing, storing and displaying data from image boards. At this moment the parser can work only with 4chan and 2ch image boards.

# Prerequisites
`Docker` should be installed on your device, and you have access to`root` user, for running docker. This tool runs on `Linux OS` only.

# Installation
1. Get the repository on your device
   ```
   git clone https://github.com/gushi-cookie/chan_parser
   ```
2. Come to the projects directory
   ```
   cd chan_parser
   ```
3. Build a Docker image
   ```
   sudo ./build.sh
   ```
4. Run the program
   ```
   sudo ./start.sh
   ```

While working, the program saves data to the /dev/shm/chan_parser directory. FileStasher can work in different modes, but at this moment it works in the "web" mode.

Check `localhost:8080` for result.