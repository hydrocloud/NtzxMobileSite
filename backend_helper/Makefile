CARGO := cargo

all: debug release

debug:
	$(CARGO) build

release:
	$(CARGO) build --release
	cp ./target/release/*.so ./
	strip ./*.so
