# Timezone Feature - Quick Reference Card

## 🚀 Quick Start

### For Users
1. Go to **Compose** section
2. Scroll to **Target Timezone** dropdown
3. Select your target timezone (e.g., 🇦🇺 Australia/Sydney)
4. Configure settings:
   - ☑️ Respect business hours (recommended)
   - ☑️ Respect weekends (recommended)
   - ☑️ Avoid night sending (recommended)
5. Start campaign as normal

---

## 🌍 Available Timezones

| Flag | Region | Timezone | UTC Offset |
|------|--------|----------|------------|
| 🇦🇺 | Australia/Sydney | Australia/Sydney | +10/+11 |
| 🇦🇺 | Australia/Melbourne | Australia/Melbourne | +10/+11 |
| 🇱🇰 | Sri Lanka | Asia/Colombo | +5:30 |
| 🇸🇬 | Singapore | Asia/Singapore | +8 |
| 🇦🇪 | UAE/Dubai | Asia/Dubai | +4 |
| 🇬🇧 | London | Europe/London | +0/+1 |
| 🇺🇸 | New York | America/New_York | -5/-4 |
| 🇺🇸 | Los Angeles | America/Los_Angeles | -8/-7 |

---

## ⚡ Speed Multipliers

| Status | Multiplier | Effect | Example |
|--------|-----------|--------|---------|
| 🟢 Business Hours (9 AM - 5 PM) | **0.7x** | 30% faster | 60s → 42s |
| 🔵 Outside Hours (weekday) | **1.5x** | 50% slower | 60s → 90s |
| 🟠 Weekend (Sat/Sun) | **3.0x** | 3x slower | 60s → 180s |
| 🔴 Night (10 PM - 6 AM) | **5.0x** | 5x slower | 60s → 300s |

---

## 📊 Time Estimates (1000 emails)

| Scenario | Duration | Notes |
|----------|----------|-------|
| **All Business Hours** | ~45 hours | Best case |
| **Mixed Hours** | ~60 hours | Typical |
| **Weekend/Night Heavy** | ~90 hours | Worst case |

---

## 🎯 Common Use Cases

### 1. Sri Lanka → Australia
```
Your time: 11:00 AM (Colombo)
Their time: 4:30 PM (Sydney)
Status: ✅ Business hours
Speed: 0.7x (faster)
```

### 2. USA → Europe
```
Your time: 9:00 AM (New York)
Their time: 2:00 PM (London)
Status: ✅ Business hours
Speed: 0.7x (faster)
```

### 3. Weekend Campaign
```
Your time: 10:00 AM (Singapore)
Their time: 12:00 PM Saturday (Sydney)
Status: 🟠 Weekend
Speed: 3.0x (much slower)
```

---

## 💡 Best Practices

### ✅ DO
- Select timezone matching recipient location
- Enable all respect options for B2B campaigns
- Start campaigns Monday morning (target time)
- Monitor real-time clock before starting

### ❌ DON'T
- Start Friday afternoon (target time)
- Disable respect options without good reason
- Mix timezones in one campaign
- Ignore the auto-wait messages

---

## 🔧 Configuration Options

### Respect Business Hours
- ✅ **Enabled:** Faster 9 AM-5 PM, slower outside
- ❌ **Disabled:** Same speed all day

### Respect Weekends
- ✅ **Enabled:** 3x slower Sat/Sun
- ❌ **Disabled:** Same speed all week

### Avoid Night Sending
- ✅ **Enabled:** 5x slower 10 PM-6 AM
- ❌ **Disabled:** Normal speed at night

---

## 🐛 Troubleshooting

### "Campaign waiting too long"
**Cause:** Started outside business hours  
**Fix:** Wait, or disable "Respect Business Hours"

### "Not respecting timezone"
**Cause:** Checkboxes not enabled  
**Fix:** Enable configuration checkboxes

### "Clock not updating"
**Cause:** No timezone selected  
**Fix:** Select timezone from dropdown

---

## 📈 Console Messages

### Campaign Start
```
🚀 Starting campaign "Australian Outreach"
🌍 Timezone: Australia/Sydney
📍 Status: Business hours (2:30 PM) - sending at normal pace
```

### Auto-Wait
```
⏰ Waiting 570 minutes until business hours...
✅ Business hours started. Resuming campaign...
```

### Per Email
```
⏱️ Waiting 42 seconds... (0.7x business hours)
⏱️ Waiting 180 seconds... (3.0x weekend)
```

---

## 📚 Documentation

- **TIMEZONE-FEATURE.md** - Full feature guide (470 lines)
- **CONFIGURATION.md** - Environment config (360 lines)
- **IMPLEMENTATION-SUMMARY.md** - Technical details (350 lines)

---

## 🔑 Key Points

1. **Optional Feature** - Campaigns work without timezone too
2. **Per-Campaign** - Each campaign can use different timezone
3. **Real-Time** - Live clock shows target timezone time
4. **Auto-Wait** - Pauses until business hours if needed
5. **No Config Needed** - Works out-of-the-box

---

## 📞 Quick Help

**Q: Do I need to configure anything?**  
A: No, works out-of-the-box. Just select timezone in UI.

**Q: Can I send without timezone?**  
A: Yes, select "No timezone targeting" in dropdown.

**Q: How do I know it's working?**  
A: Check console for timezone messages and multipliers.

**Q: Can I change timezone mid-campaign?**  
A: No, timezone set when campaign starts.

**Q: Does this slow down my campaigns?**  
A: Actually faster during target business hours (0.7x)!

---

**Last Updated:** December 2024  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
