import inquirer from 'inquirer';
import inquirerS3 from 'inquirer-s3';

inquirer.registerPrompt('s3-object', inquirerS3);

export function chooseS3BucketPrompt(message:string, name:string, initial?: string) {
  return {
    message,
    type: 'input',
    name,
    default: initial,
    askAnswered: true,
    validate(answer: string) {
      if ((answer?.length ?? 0) === 0) {
        return `You must enter the name of an S3 bucket.`;
      }
      return true;
    },
  };
}

export function chooseS3ObjectPrompt(message:string, name:string, bucket:string, objectPrefix?:string) {
  return      {
    message,
    type: 's3-object',
    name,
    bucket,
    objectPrefix,
    pageSize: 20,
    loop: false,
    askAnswered: true,
  };
}
