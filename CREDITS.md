# Third-party assets

The MIT license covers this project's original application code, documentation, and Lotto-ball mascots.
It does not grant rights to the official lottery marks below.

| Asset | Source | License / ownership |
| --- | --- | --- |
| `assets/lotto-official.svg` | [Donghaeng Lottery](https://www.dhlottery.co.kr/resources/img/images/img-draw-hLogo01.svg) | Official Lotto 6/45 mark; rights remain with the original rights holders. No open-source license was identified. |
| `assets/donghaeng-official.svg` | [Donghaeng Lottery](https://www.dhlottery.co.kr/resources/img/main_img/logo_dong.svg) | Official operator mark; rights remain with the original rights holders. No open-source license was identified. |
| `assets/pretendard-variable.woff2` | [Pretendard](https://github.com/orioncactus/pretendard) | SIL Open Font License 1.1; included in `assets/pretendard-OFL.txt`. |
| `assets/lotto-sans.woff2` | Locally subset from the vendored Pretendard font with `scripts/subset-font.py`; internal family renamed Lotto Sans | SIL Open Font License 1.1; the original copyright and license remain in `assets/pretendard-OFL.txt`. |
| `assets/manrope-bold.ttf` | [Manrope](https://github.com/sharanda/manrope) | SIL Open Font License 1.1; included in `assets/manrope-OFL.txt`. |

The official marks identify the lottery being simulated. This is an independent,
unofficial simulator with no affiliation to or endorsement by Donghaeng Lottery.
Forks can replace the two official marks with their own branding.

Lottery rules and fixed fourth/fifth prizes were verified against the
[official Lotto 6/45 introduction](https://www.dhlottery.co.kr/lt645/intro)
on October 3, 2026 (KST).

## Original character art

`assets/lotto-mascots-sheet.png` contains five original characters generated with
OpenAI image generation for Lotto Lab on October 3, 2026. It is a 1536×1024
transparent 3×2 sprite sheet: orange warm-up, blue office worker, green clover,
coral purse, yellow crown; the last cell is empty. The project distributes this
original character asset under MIT. The mascot artwork does not contain the
official lottery marks. CSS and the share-card canvas reuse the same cells.

The exact generation prompt and mode are saved in [assets/mascots-prompt.md](assets/mascots-prompt.md).
