# Quick tests for Quipuswap

Engaging Michelson interpreter to quickly check math soundness for Quipuswap.
Powered by PyTezos.

## Prerequisites

Install cryptographic libraries according to your system following the instrucitons here:
https://pytezos.org/quick_start.html#requirements

Building DEX requires Ligo or Dockerized ligo version 0.15.0 installed.

## Installation

### Either system-wide

```
python3 -m pip install pytezos
./integration_tests/build_dex.sh
```

### Or using venv

```
virtualenv venv
. venv/bin/activate
pip3 install pytezos pytest
./integration_tests/build_dex.sh
```


## Usage
```
python3 -m pytest . -v -s
```
