#!/bin/sh

ligo compile-contract integration_tests/MockDex.ligo main > integration_tests/MockDex.tz
ligo compile-contract integration_tests/MockTTDex.ligo main > integration_tests/MockTTDex.tz
