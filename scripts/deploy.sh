if [ $npm_package_config_standard = "fa2" ]
then
    ./scripts/deploy_fa2.sh
else
    ./scripts/deploy_fa1.2.sh
fi