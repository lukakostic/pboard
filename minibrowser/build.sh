#c++ main.cc -O2 --std=c++11 -Ilibs $(pkg-config --cflags --libs gtk+-3.0 webkit2gtk-4.1) -ldl -o example

#make -G Ninja -B build -S . -D CMAKE_BUILD_TYPE=Release
cmake --build build