# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- Baker Registry Contract that keeps records of the real bakers and helps to avoid unnecessary redelegation on Dex contracts.
- Baker rewards rests (lower then 1 mutez) are compunded and can be withdrawn by user.
- Token to Token Dex version :fire:.

### Changed

- Calculation of shares during investment is now calculated based on provided XTZ amount instead of both XTZ and ax FA tokens amount. The limit of FA tokens is still taken into account.
- Dex calls Baker Registry to check if the candidate is baker instead of try to delegate.
- The contract only checks if the candidate is baker if he is proposed in the first time.
- flash tests; 20 times boost :heart_eyes:
