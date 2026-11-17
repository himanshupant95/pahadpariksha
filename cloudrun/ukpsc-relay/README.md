# UKPSC relay (Google Cloud Run, Mumbai)

psc.uk.gov.in blocks non-Indian IPs. This service runs in `asia-south1` and returns psc.uk.gov.in pages
so the GitHub notices workflow can read them. Deploy from Cloud Shell:

```sh
git clone https://github.com/himanshupant95/pahadpariksha.git && cd pahadpariksha/cloudrun/ukpsc-relay
gcloud run deploy ukpsc-relay --source . --region asia-south1 --allow-unauthenticated \
  --max-instances 1 --memory 256Mi --cpu 1 --timeout 60
```

Then set the repo variable `UKPSC_RELAY` to the service URL (Settings → Secrets and variables → Actions → Variables).
