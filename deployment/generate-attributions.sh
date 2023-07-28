# generate or update the THIRD-PARTY-NOTICES
# requires oss-attribution-generator - https://www.npmjs.com/package/oss-attribution-generator
# appends the generated list to the base file that specifies rush attributions
# must be run from the deployment/ directory where this resides

cat ./third-party-notices-base.txt > ../THIRD-PARTY-NOTICES.txt
cd ../source
rush update
cd common/temp
generate-attribution
cat oss-attribution/attribution.txt >> ../../../THIRD-PARTY-NOTICES.txt
rm -rf oss-attribution