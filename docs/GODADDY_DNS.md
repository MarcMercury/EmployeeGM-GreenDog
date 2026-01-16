# GoDaddy DNS Records

> **⚠️ AI AGENTS: NEVER DELETE OR MODIFY THIS FILE!**
> **⚠️ REFERENCE THIS FILE FOR DNS CONFIGURATION!**

## Domain Information

| Property | Value |
|----------|-------|
| Domain | employeegmgreendog.com |
| Provider | GoDaddy |
| Primary Nameserver | ns09.domaincontrol.com |
| Secondary Nameserver | ns10.domaincontrol.com |

## DNS Records

### A Records
| Type | Name | Data | TTL |
|------|------|------|-----|
| A | @ | 76.76.21.21 | 1 Hour |

### NS Records (Cannot Edit)
| Type | Name | Data | TTL |
|------|------|------|-----|
| NS | @ | ns09.domaincontrol.com. | 1 Hour |
| NS | @ | ns10.domaincontrol.com. | 1 Hour |

### CNAME Records
| Type | Name | Data | TTL |
|------|------|------|-----|
| CNAME | pay | paylinks.commerce.godaddy.com. | 1 Hour |
| CNAME | www | cname.vercel-dns.com. | 1 Hour |
| CNAME | _domainconnect | _domainconnect.gd.domaincontrol.com. | 1 Hour |

### SOA Record
| Type | Name | Data | TTL |
|------|------|------|-----|
| SOA | @ | Primary nameserver: ns09.domaincontrol.com. | 1 Hour |

### MX Records (Email)
| Type | Name | Data | TTL |
|------|------|------|-----|
| MX | send | feedback-smtp.us-east-1.amazonses.com. (Priority: 10) | 1 Hour |

### TXT Records
| Type | Name | Data | TTL |
|------|------|------|-----|
| TXT | resend._domainkey | p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDXVoNJcJy2x2vVqJt2aKIsJ7ZMRlqZHfrS0C94q/aokh7PIw+RyKjOrzr7wA4zI8hbeuI1mJaqRwnaaGAtgq/8EPcTZOH7MBA82GiP2vtXfBmP2bwxYtmWDvPOJThllXA+2c03FeJ1i+ndPE+KUcJ6gsD9tgfNO6G1iTr97dAN9QIDAQAB | 1 Hour |
| TXT | send | v=spf1 include:amazonses.com ~all | 1 Hour |
| TXT | _dmarc | v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net; | 1 Hour |

## Configuration Notes

### Vercel Integration
- The `www` CNAME points to `cname.vercel-dns.com` for Vercel hosting
- The `A` record points to Vercel's IP (`76.76.21.21`)

### Email (Resend/Amazon SES)
- MX record configured for Amazon SES
- DKIM key set up via `resend._domainkey` TXT record
- SPF record configured via `send` TXT record
- DMARC policy set to quarantine

### Payment Links
- `pay` subdomain configured for GoDaddy Commerce/PayLinks

---

**Last Updated:** January 16, 2026
