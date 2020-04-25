# Desktop pdf converter

This repo contains the source code for our [desktop pdf converter](https://app.spikedata.co.za/docs/solutions/statement-processing/desktop-converter/). The tool can be used directly without needing the source code. However we have made the source code publicly accessible in order to provide a useful demonstration of using the [pdf API](https://app.spikedata.co.za/docs/code/api/pdf/) in a more complete application than the [CLI app](https://app.spikedata.co.za/docs/code/samples/spike-sample-client/) sample.

## Run cli

```sh
# single .pdf
npx @spike/pdf-tool file --input absa.pdf
# => will write absa.json & absa.csv

# folder of .pfs
npx @spike/pdf-tool folder --folder C:\pdfs --quiet
```

see also [@spike/converter-cli](https://www.npmjs.com/package/@spike/converter-cli) to convert .json output to .ofx

## Source code

```bash
# clone source code and install package dependencies:
git clone https://github.com/spikedata/spike-pdf-tool
cd spike-pdf-tool
npm install

# run
node src/app --version
```
