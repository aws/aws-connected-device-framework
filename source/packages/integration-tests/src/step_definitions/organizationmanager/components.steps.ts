import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
    BulkComponentsResource,
    BulkComponentsService,
    Manifest,
    ORGMANLIBRARY_CLIENT_TYPES,
} from '@awssolutions/cdf-organizationmanager-client';
import { DataTable, Then, When } from '@cucumber/cucumber';
import { fail } from 'assert';
import { expect } from 'chai';
import { container } from '../../di/inversify.config';
import { buildModel, validateExpectedAttributes } from '../common/common.steps';
import { getAdditionalHeaders, world } from './organizationalManager.world';

import fs from 'fs';
import yaml from 'js-yaml';
import JSZip from 'jszip';
import { Readable } from 'stream';

const {
    CONTROL_TOWER_MANIFEST_FILENAME: manifestFilename,
    CONTROL_TOWER_MANIFEST_BUCKET: manifestBucket,
    CONTROL_TOWER_MANIFEST_PREFIX: manifestPrefix,
} = process.env;

const temporaryManifestFile = `/tmp/${manifestFilename}`;
const s3: S3Client = new S3Client({ region: process.env.AWS_REGION });
const bulkComponentsService: BulkComponentsService = container.get(
    ORGMANLIBRARY_CLIENT_TYPES.BulkComponentsService
);

function saveManifestFileToTempFolder(
    bucket: string,
    key: string,
    filePath: string
): Promise<void> {
    const ws = fs.createWriteStream(filePath);
    return new Promise((resolve, reject) => {
        s3.send(
            new GetObjectCommand({
                Bucket: bucket,
                Key: key,
            })
        ).then((result) => {
            const stream = result.Body as Readable;
            stream.on('data', (chunk) => ws.write(chunk));
            stream.on('end', () => {
                ws.end();
                resolve();
            });
            stream.on('error', (err) => reject(err));
        });
    });
}

async function loadManifestFromFile(filePath: string): Promise<string> {
    const data = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(data);
    const manifestFile = await zip.file('manifest.yaml').async('string');
    return manifestFile;
}

When(
    'organizational unit {string} has {int} components',
    async function (organizationalUnitId: string, numOfComponents: number) {
        try {
            const components = await bulkComponentsService.bulkGetComponents(
                organizationalUnitId,
                getAdditionalHeaders(world)
            );
            expect(components.length).to.equal(numOfComponents);
        } catch (err) {
            world.errStatus = err.status;
            fail(`bulkGetComponents failed, err: ${JSON.stringify(err)}`);
        }
    }
);

When(
    'I load these components to organizational unit {string}',
    async function (organizationalUnitId: string, data: DataTable) {
        try {
            const componentResourceList: BulkComponentsResource = buildModel(data);
            const result = await bulkComponentsService.bulkCreateComponents(
                organizationalUnitId,
                componentResourceList,
                getAdditionalHeaders(world)
            );
            expect(result.success).to.equal(componentResourceList.components.length);
        } catch (err) {
            world.errStatus = err.status;
            fail(`bulkCreateComponents failed, err: ${JSON.stringify(err)}`);
        }
    }
);

When(
    'I bulk delete the components from organizational unit {string}',
    async function (organizationalUnitId: string) {
        try {
            await bulkComponentsService.bulkDeleteComponents(
                organizationalUnitId,
                getAdditionalHeaders(world)
            );
        } catch (err) {
            world.errStatus = err.status;
            fail(`bulkDeleteComponents failed, err: ${JSON.stringify(err)}`);
        }
    }
);

Then('Manifest file exists with attributes:', async function (data: DataTable) {
    let config: Manifest;
    try {
        await saveManifestFileToTempFolder(
            manifestBucket,
            `${manifestPrefix}/${manifestFilename}`,
            temporaryManifestFile
        );
        const manifestFile = await loadManifestFromFile(temporaryManifestFile);

        config = yaml.load(manifestFile);
    } catch (err) {
        console.log(err);
        world.errStatus = err.status;
        fail(`manifest file generation failed, err: ${JSON.stringify(err)}`);
    }
    validateExpectedAttributes(config, data);
});
