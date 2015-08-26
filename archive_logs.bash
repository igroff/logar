#!/usr/bin/env bash
set -eo pipefail

(
# only wait 30 seconds to get lock
# since we will run multiple times per day
flock -ew 30 200 || (
  echo "$(date -Is) Unable to aquire lock for daily recommendation rebuild"
  false
)

pushd ${LOG_DIR}

LOG_FILES=$(ls | grep -v "\.gz$")
for LOG_FILE in ${LOG_FILES}; do
  if [ -f $LOG_FILE ]; then
    TARGET=${LOG_FILE}-$( date +%F_%H_%M_%S )-${EC2_REGION}
    mv ${LOG_FILE} ${TARGET}
    gzip ${TARGET}
    aws s3 cp ${TARGET}.gz ${S3_ARCHIVE_BUCKET}/${LOG_FILE%%_*}/
    rm ${TARGET}.gz
  fi;
done

popd

) 200< /app/.LOCK
