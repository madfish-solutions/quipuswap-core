if [ $npm_package_config_standard = "fa2" ]
then
    ./scripts/set_functions_fa2.sh
else
    ./scripts/set_token_functions_fa1.2.sh
    ./scripts/set_dex_functions_fa1.2.sh
fi