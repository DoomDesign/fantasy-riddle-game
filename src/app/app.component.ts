import { Component, ElementRef, inject, OnInit, Renderer2, ViewChild } from '@angular/core';
import { environment } from '../environments/environment.prod';

import {inRange, isEqual} from 'lodash';

enum entityIndicator {
	'GOLD',
	'DRACHE',
	'MORGOTH',
	'ORK',
	'RINGE',
	'MENSCH',
	'SCHWERT',
	'ZWERG'
}

type GameEntity = {
	name: string;
	image: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
	public displayDebugInfo: boolean = !!(environment?.production === false) && true;

	public gameState: number = 0;

	public totalTurnDegree: number = 0;
	public singleTurnDegree: number = 0;
	public turnSpeedSeconds = 1;

	public turningDirection: -1|0|1 = 0;

	public firstPosToSwitch !: number|undefined;

	public firstPossibleSwitch !: number|undefined;
	public secondPossibleSwitch !: number|undefined;

	private readonly innerPositions = [2, 4, 6, 8];
	private readonly outerPositions = [1, 3, 5, 7];

	private disableTimeout !: ReturnType<typeof setTimeout>|undefined;
	private turningTimeout !: ReturnType<typeof setTimeout>|undefined;
	// private highlightTimeouts: Map<number, ReturnType<typeof setTimeout>|undefined> = new Map();
	private highlightTimeouts: Map<number, Promise<void>> = new Map();

	public positions !: {[pos: number]: entityIndicator};

	public globalControlsDisabled: boolean = false;

	public finalFX: number = 1;

	public audioMuted: boolean = false;
	private sfx_turn_cw: HTMLAudioElement = new Audio(`assets/sfx/turn_cw.mp3`);
	private sfx_turn_ccw: HTMLAudioElement = new Audio(`assets/sfx/turn_ccw.mp3`);
	private sfx_switch: HTMLAudioElement = new Audio(`assets/sfx/switch2.mp3`);
	private sfx_fail: HTMLAudioElement = new Audio(`assets/sfx/fail.mp3`);
	private sfx_rumble: HTMLAudioElement = new Audio(`assets/sfx/rumble.mp3`);

	@ViewChild('finalvideo') private finalVideoEl !: ElementRef;
	@ViewChild('rulesmodal') private rulesModalEl !: ElementRef;

	public readonly gameEntities: {[key in entityIndicator|any]: GameEntity} = {
		[entityIndicator.ZWERG]: {
			name: 'Zwerg',
			image: 'icon_zwerg.png'
		},
		[entityIndicator.MENSCH]: {
			name: 'Mensch',
			image: 'icon_mensch.png'
		},
		[entityIndicator.DRACHE]: {
			name: 'Drache',
			image: 'icon_drache.png'
		},
		[entityIndicator.ORK]: {
			name: 'Ork',
			image: 'icon_ork.png'
		},
		[entityIndicator.MORGOTH]: {
			name: 'Morgoth',
			image: 'icon_morgoth.png'
		},
		[entityIndicator.RINGE]: {
			name: 'Ringe',
			image: 'icon_ringe.png'
		},
		[entityIndicator.GOLD]: {
			name: 'Gold',
			image: 'icon_gold.png'
		},
		[entityIndicator.SCHWERT]: {
			name: 'Schwert',
			image: 'icon_schwert.png'
		}
	};

	constructor(private renderer: Renderer2) {}

	ngOnInit(): void {
		this.resetGame();

		[this.sfx_switch, this.sfx_turn_ccw, this.sfx_turn_cw, this.sfx_fail].forEach(sfx => {
			try {
				sfx.addEventListener('ended', () => {
					sfx.currentTime = 0;
					sfx.pause();
				})
			} catch (error) {

			}
		})
	}

	rotateInnerCircle(dir: 'cw'|'ccw') {
		// cancel if it is turning right now
		if(this.gameState === 1 || this.singleTurnDegree !== 0 || !!this.turningTimeout) {
			return;
		}

		// check rules of turning
		let isAllowed = true;

		// check if ZWERG is in the inner circle and if yes, if GOLD is its neighbor
		const dwarfPos = this.getPositionForEntityIndicator(entityIndicator.ZWERG);
		if(dwarfPos && this.innerPositions.includes(dwarfPos)) {
			const dwarfNeighbors = this.getPossiblePositions(dwarfPos);
			const goldPos = this.getPositionForEntityIndicator(entityIndicator.GOLD);
			if(dwarfNeighbors && dwarfNeighbors.includes(goldPos)) {
				isAllowed = false;
				this.highlightPos([dwarfPos, goldPos], 'error', 500);
				this.playAudio('fail');
			}
		}

		if(!isAllowed) {
			return;
		}

		this.deselectPositions();
		this.disableAllControls(this.turnSpeedSeconds * 1000);

		let cb: Function;

		switch (dir) {
			case 'ccw':
				console.log("turning counter-clockwise");
				this.totalTurnDegree -= 90;
				this.singleTurnDegree = -90;

				this.turningDirection = -1;

				this.playAudio('turn_ccw');

				cb = () => {
					this.setNewInnerPositions('ccw');
				}
				break;
			case 'cw':
				console.log("turning clockwise");
				this.totalTurnDegree += 90;
				this.singleTurnDegree = 90;

				this.turningDirection = 1;

				this.playAudio('turn_cw');

				cb = () => {
					this.setNewInnerPositions('cw');
				}
				break;

			default:
				break;
		}


		this.turningTimeout = setTimeout(() => {
			clearTimeout(this.turningTimeout);
			this.turningTimeout = undefined;
			this.singleTurnDegree = 0;

			if(cb && typeof cb === 'function') {
				cb();
			}
		}, this.turnSpeedSeconds * 1000);
	}

	private setNewInnerPositions(dir: 'cw'|'ccw') {
		const oldPositions = {...this.positions};
		let newPositions = {...this.positions};

		switch (dir) {
			case 'cw':
				newPositions[8] = oldPositions[6];
				newPositions[2] = oldPositions[8];
				newPositions[4] = oldPositions[2];
				newPositions[6] = oldPositions[4];
				break;
			case 'ccw':
				newPositions[8] = oldPositions[2];
				newPositions[2] = oldPositions[4];
				newPositions[4] = oldPositions[6];
				newPositions[6] = oldPositions[8];
				break;
			default:
				break;
		}

		this.positions = {...newPositions};
		this.checkWinningConditions();
	}

	public switchInnerAndOuterContent(firstPos: number, secondPos: number) {
		console.log("TRY TO SWITCH...:", firstPos, secondPos)

		if(this.gameState === 1 || this.validateSwitch(firstPos, secondPos) === false) {
			return;
		}

		const oldPositions = {...this.positions};
		let newPositions = {...this.positions};

		newPositions[firstPos] = oldPositions[secondPos];
		newPositions[secondPos] = oldPositions[firstPos];

		this.positions = {...newPositions};
		this.highlightPos([firstPos, secondPos], 'success', 1000);
		this.playAudio('switch');
		console.log("SUCCESSFULLY SWITCHED", firstPos, secondPos);

		this.checkWinningConditions();
	}

	private validateSwitch(firstPos: number|undefined, secondPos: number|undefined): boolean {
		const handleDisallowed = (reason?: string, overrideErrorHighlightPos?: number[]) => {
			console.log(`SWITCHING RULE ERROR FOR POS ${firstPos} & ${secondPos}: ${reason}`);
			if(!overrideErrorHighlightPos) {
				this.highlightPos([firstPos, secondPos], 'error', 500);
			} else {
				this.highlightPos(overrideErrorHighlightPos, 'error', 500);
			}
			this.playAudio('fail');
		}

		if(!firstPos || !secondPos) {
			handleDisallowed('No firstPos or secondPos');
			return false;
		}

		let isAllowed = true;
		// check positions and if they are forbidden to switch


		// identify possible positions to switch, then check if the result is valid
		const possibleSecondPositions = this.getPossiblePositions(firstPos);
		isAllowed = possibleSecondPositions && possibleSecondPositions?.length === 2 && possibleSecondPositions?.includes(secondPos);

		if(!isAllowed) {
			handleDisallowed('Possible Second Positions not valid');
			return false;
		}

		const outerFirstPos = this.outerPositions.find(pos => firstPos === pos);
		const outerSecondPos = this.outerPositions.find(pos => secondPos === pos);
		const innerFirstPos = this.innerPositions.find(pos => firstPos === pos);
		const innerSecondPos = this.innerPositions.find(pos => secondPos === pos);

		isAllowed = !!( (outerFirstPos && innerSecondPos) || (innerFirstPos && outerSecondPos) );

		if(!isAllowed) {
			handleDisallowed('Could not find an outerPos and an innerPos');
			return false;
		}

		// get entityIndicators for both positions
		const outerEntityIndicator: entityIndicator = outerFirstPos ? this.positions[<number>outerFirstPos] : this.positions[<number>outerSecondPos];
		const innerEntityIndicator: entityIndicator = innerFirstPos ? this.positions[<number>innerFirstPos] : this.positions[<number>innerSecondPos];

		isAllowed = !!(outerEntityIndicator !== undefined && innerEntityIndicator !== undefined && (outerEntityIndicator !== innerEntityIndicator));

		if(!isAllowed) {
			handleDisallowed(`outerEntityIndicator and innerEntityIndicator are the same - WTF? ${outerEntityIndicator}, ${innerEntityIndicator}`);
			return false;
		}

		// specific rules:
		// 1) GOLD/ZWERG
		// when DWARF or GOLD are direct neigbors and one of them is selected, only they can be switched
		const firstDwarfGoldCheck = [entityIndicator.GOLD, entityIndicator.ZWERG].includes(this.positions[firstPos]);
		const firstNeighborsCheck = possibleSecondPositions.some(pos => [entityIndicator.GOLD, entityIndicator.ZWERG].includes(this.positions[pos]));
		// check if secondPos is gold/dwarf OR one of its neighbors
		const secondDwarfGoldCheck = [entityIndicator.GOLD, entityIndicator.ZWERG].includes(this.positions[secondPos]);
		const neighborsForSecondPos = this.getPossiblePositions(secondPos)?.filter(pos => pos !== firstPos);
		const secondNeighborsCheck = neighborsForSecondPos.some(pos => [entityIndicator.GOLD, entityIndicator.ZWERG].includes(this.positions[pos]));


		if(!!firstDwarfGoldCheck) {
			// firstPos is gold/zwerg, then only allow switching when there are no gold/zwerg neighbors OR to another gold/zwerg
			isAllowed = !firstNeighborsCheck || !!secondDwarfGoldCheck;
		} else {
			// firstPos is no gold/zwerg, so allow switching if secondPos is no gold/zwerg OR if secondPos IS gold/zwerg, but not its neighbors!
			isAllowed = !secondDwarfGoldCheck || !secondNeighborsCheck;
		}

		if(!isAllowed) {
			const goldPos: number = this.getPositionForEntityIndicator(entityIndicator.GOLD) || 0;
			const zwergPos: number = this.getPositionForEntityIndicator(entityIndicator.ZWERG) || 0;
			handleDisallowed('Zwerg/Gold rule violation', [firstPos, secondPos, goldPos, zwergPos]);
			return false;
		}

		// 2) ORK rule
		// when outerEntityIndicator is entityIndicator.ORK, then only allow the switch when afterwards the ORK is not diagonally in front of entityIndicator.RINGE
		if([entityIndicator.ORK, entityIndicator.RINGE].includes(outerEntityIndicator)) {

			const outerPos = outerFirstPos || outerSecondPos;
			const innerPos = innerFirstPos || innerSecondPos;

			let posToCheck;

			switch (innerPos) {
				case 8:
					posToCheck = 4;
					break;
				case 2:
					posToCheck = 6;
					break;
				case 4:
					posToCheck = 8;
					break;
				case 6:
					posToCheck = 2;
					break;
				default:
					break;
			}

			if(!!posToCheck) {
				isAllowed = this.positions[posToCheck] !== (outerEntityIndicator === entityIndicator.ORK ? entityIndicator.RINGE : entityIndicator.ORK);

				if(!isAllowed) {
					handleDisallowed('ORK AND RINGE CANNOT BE DIAGONALLY OPPOSITE OF EACH OTHER', [posToCheck, firstPos, secondPos]);
					return false;
				}
			}
		}

		return isAllowed;
	}

	public resetGame() {
		this.enableAllControls();
		this.deselectPositions();
		this.highlightTimeouts.clear();
		this.gameState = 0;
		this.finalFX = 0;
		this.positions = {
		// inner
			2: entityIndicator.ZWERG,
			4: entityIndicator.MENSCH,
			6: entityIndicator.ORK,
			8: entityIndicator.SCHWERT,

		// outer
			1: entityIndicator.MORGOTH,
			3: entityIndicator.DRACHE,
			5: entityIndicator.GOLD,
			7: entityIndicator.RINGE
		};
	}

	public selectPosToSwitch(posNum: number) {
		if(this.gameState === 1 || !posNum) {
			return;
		}

		// turn off the first selected element, if selected again
		if(this.firstPosToSwitch === posNum) {
			this.deselectPositions();
			return;
		}

		// set the first selected element
		if(this.firstPosToSwitch === undefined) {
			this.firstPosToSwitch = posNum;
			this.selectPossiblePositions(posNum);
		} else {
			// try to switch elements
			this.switchInnerAndOuterContent(this.firstPosToSwitch, posNum);

			this.deselectPositions();
		}
	}

	public deselectPositions(): void {
		this.firstPosToSwitch = undefined;
		this.firstPossibleSwitch = undefined;
		this.secondPossibleSwitch = undefined;
	}

	public getPossiblePositions(posNum: number): number[] {
		let output = [ ];
		switch (posNum) {
			case 1:
				output = [8, 2];
				break;
			case 8:
				output = [7, 1];
				break;
			default:
				output = [posNum - 1, posNum + 1];
				break;
		}
		return output;
	}

	private selectPossiblePositions(posNum: number) {
		if(!posNum) {
			return;
		}
		const possiblePositions = this.getPossiblePositions(posNum);
		if(possiblePositions && possiblePositions?.length === 2) {
			this.firstPossibleSwitch = possiblePositions[0];
			this.secondPossibleSwitch = possiblePositions[1];
		}
	}

	public highlightPos(positions: (number|undefined)[] = [ ], className: string, duration: number = 0) {
		if(!Array.isArray(positions) || !className) {
			console.log("HIGHLIGHT POS ERROR", positions);
			return;
		}

		this.disableAllControls(duration);

		positions?.forEach((pos) => {
			if(!pos) {
				return;
			}

			if(!this.highlightTimeouts.get(pos)) {


				const posEl = document.querySelector(`.position.position-${pos}`);
				posEl?.classList?.add(className);

				if(duration && duration > 0) {
					this.highlightTimeouts.set(pos,
						new Promise<void>((resolve, reject) => {
							setTimeout(() => {

								posEl?.classList?.remove(className);

								resolve();

								this.highlightTimeouts.delete(pos);

							}, duration);
						})
					);
				}
			} else {
				console.log("THERE IS STILL A PROMISE IN THE MAP", this.highlightTimeouts.get(pos));
			}
		});
	}

	disableAllControls(duration?: number): void {
		if(!this.disableTimeout) {
			this.globalControlsDisabled = true;
		}

		if(duration && duration > 0 && !this.disableTimeout) {
			this.disableTimeout = setTimeout(() => {
				this.enableAllControls();
				clearTimeout(this.disableTimeout);
				this.disableTimeout = undefined;
			}, duration);
		}
	}

	enableAllControls(): void {
		this.globalControlsDisabled = false;
	}

	getPositionForEntityIndicator(indicator: entityIndicator): number {
		let output = Object.keys(this.positions).find((key: string) => this.positions[parseInt(key)] === indicator);
		let outputNumber = output && !isNaN(parseInt(output)) ? parseInt(output) : -1;
		return outputNumber;
	}

	playAudio(sfx: 'turn_ccw'|'turn_cw'|'switch'|'fail'|'rumble'): void {
		if(!this.sfx_turn_ccw || !this.sfx_turn_cw || !this.sfx_switch || !!this.audioMuted) {
			return;
		}

		console.log("PLAYING SFX", sfx);

		switch (sfx) {
			case 'turn_ccw':
				this.pauseAudio(this.sfx_turn_ccw);
				this.sfx_turn_ccw.play();
				break;
			case 'turn_cw':
				this.pauseAudio(this.sfx_turn_cw);
				this.sfx_turn_cw.play();
				break;
			case 'switch':
				this.pauseAudio(this.sfx_switch);
				this.sfx_switch.play();
				break;
			case 'fail':
				this.pauseAudio(this.sfx_fail);
				this.sfx_fail.play();
				break;
			case 'rumble':
				this.pauseAudio(this.sfx_rumble);
				this.sfx_rumble.play();
				break;
			default:
				break;
		}
	}

	private pauseAudio(audio: HTMLAudioElement) {
		audio?.pause();
		audio.currentTime = 0;
	}

	public toggleMute() {
		this.audioMuted = !this.audioMuted;
	}

	private checkWinningConditions() {
		const winningPositions = {
			// inner
				8: entityIndicator.ZWERG,
				2: entityIndicator.DRACHE,
				4: entityIndicator.ORK,
				6: entityIndicator.MENSCH,

			// outer
				1: entityIndicator.GOLD,
				3: entityIndicator.MORGOTH,
				5: entityIndicator.RINGE,
				7: entityIndicator.SCHWERT
			};

		if(isEqual(winningPositions, this.positions)) {

			console.log("GAME WON!");
			this.gameState = 1;
			this.disableAllControls();


			Promise.all( Array.from(this.highlightTimeouts.values()) ).then(() => {

				for(let n = 1; n <= 8; n++) {
					setTimeout(() => {
						this.highlightPos([n], 'isSelected');
						this.playAudio('switch');
					}, 750 * n);
				}

				// lightFX
				setTimeout(() => {
					this.finalFX = 1;

					if(this.finalVideoEl?.nativeElement) {
						try {
							console.log(this.finalVideoEl.nativeElement, "PLAYING VIDEO");
							this.finalVideoEl?.nativeElement?.play();
							this.playAudio('rumble');
						} catch (error) {
							console.log("error playing video:", error);
						}
					} else {
						console.log("no video el");
					}

					setTimeout(() => {
						this.finalFX = 2;
					}, 8000);
				}, 10 * 750);
			})

		}
	}

	public showRulesModal(): void {
		if (typeof this.rulesModalEl.nativeElement.showModal === "function") {
			this.rulesModalEl.nativeElement.showModal();
		}
	}
}
