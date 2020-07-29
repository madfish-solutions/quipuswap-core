if [ $npm_package_config_standard = "fa2" ]
then
    ./scripts/build_fa2.sh
else
    ./scripts/build_fa1.2.sh
fi
