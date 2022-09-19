import { Component, ElementRef, OnInit, Renderer2, ViewChild } from '@angular/core';

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
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'anton-quizgame';

	public totalTurnDegree: number = 0;
	public singleTurnDegree: number = 0;
	public turnSpeedSeconds = 1;

	public turningDirection: -1|0|1 = 0;

	public firstPosToSwitch !: number|undefined;

	public firstPossibleSwitch !: number|undefined;
	public secondPossibleSwitch !: number|undefined;

	private readonly innerPositions = [2, 4, 6, 8];
	private readonly outerPositions = [1, 3, 5, 7];


	public positions !: {[key: string]: {[pos: number]: entityIndicator}};

	public globalControlsDisabled: boolean = false;

	public readonly gameEntities: {[key in entityIndicator|any]: GameEntity} = {
		[entityIndicator.ZWERG]: {
			name: 'Zwerg'
		},
		[entityIndicator.MENSCH]: {
			name: 'Mensch'
		},
		[entityIndicator.DRACHE]: {
			name: 'Drache'
		},
		[entityIndicator.ORK]: {
			name: 'Ork'
		},
		[entityIndicator.MORGOTH]: {
			name: 'Morgoth'
		},
		[entityIndicator.RINGE]: {
			name: 'Ringe'
		},
		[entityIndicator.GOLD]: {
			name: 'Gold'
		},
		[entityIndicator.SCHWERT]: {
			name: 'Schwert'
		}
	};

	constructor(private renderer: Renderer2) {}

	ngOnInit(): void {
		this.resetGame();
	}

	turnCCW() {
		// cancel if it is turning right now
		if(this.singleTurnDegree !== 0) {
			return;
		}

		this.deselectPositions();

		console.log("turning counter-clockwise");
		this.totalTurnDegree -= 90;
		this.singleTurnDegree = -90;

		this.turningDirection = -1;

		setTimeout(() => {
			// this.turningDirection = 0;
			this.singleTurnDegree = 0;

			this.setNewInnerPositions('ccw');
		}, this.turnSpeedSeconds * 1000);
	}

	turnCW() {
		// cancel if it is turning right now
		if(this.singleTurnDegree !== 0) {
			return;
		}

		this.deselectPositions();

		console.log("turning clockwise");
		this.totalTurnDegree += 90;
		this.singleTurnDegree = 90;

		this.turningDirection = 1;

		setTimeout(() => {
			// this.turningDirection = 0;
			this.singleTurnDegree = 0;

			this.setNewInnerPositions('cw');
		}, this.turnSpeedSeconds * 1000);
	}

	private setNewInnerPositions(dir: 'cw'|'ccw') {
		const oldInnerPositions = {...this.positions['inner']};
		let newInnerPositions = {...this.positions['inner']};

		switch (dir) {
			case 'cw':
				newInnerPositions[8] = oldInnerPositions[6];
				newInnerPositions[2] = oldInnerPositions[8];
				newInnerPositions[4] = oldInnerPositions[2];
				newInnerPositions[6] = oldInnerPositions[4];
				break;
			case 'ccw':
				newInnerPositions[8] = oldInnerPositions[2];
				newInnerPositions[2] = oldInnerPositions[4];
				newInnerPositions[4] = oldInnerPositions[6];
				newInnerPositions[6] = oldInnerPositions[8];
				break;
			default:
				break;
		}

		this.positions['inner'] = {...newInnerPositions};
	}

	public switchInnerAndOuterContent(firstPos: number|undefined, secondPos: number|undefined) {
		console.log("TRY TO SWITCH...:", firstPos, secondPos)

		const handleDisallowed = () => {
			this.highlightPos([firstPos, secondPos], 'error', 1000);
		}

		if(!firstPos || !secondPos) {
			handleDisallowed();
			return;
		}

		let isAllowed = true;
		// check positions and if they are forbidden to switch
		// ...

		// outerPos & innerPos are valid numbers and we have one outer and one inner position
		isAllowed = (this.outerPositions.includes(firstPos) && this.innerPositions.includes(secondPos)) ||
		(this.innerPositions.includes(firstPos) && this.outerPositions.includes(secondPos));

		if(!isAllowed) {
			handleDisallowed();
			return;
		}

		const outerPos = this.outerPositions.find(pos => [firstPos, secondPos].includes(pos));
		const innerPos = this.innerPositions.find(pos => [firstPos, secondPos].includes(pos));

		if(!outerPos || !innerPos) {
			handleDisallowed();
			return;
		}

		// only allow to switch an outerPos with it's immediate neighbors
		switch (outerPos) {
			case 1:
				isAllowed = [8, 2].includes(innerPos);
				break;
			default:
				isAllowed = [outerPos-1, outerPos+1].includes(innerPos);
				break;
			}

		if(!isAllowed) {
			handleDisallowed();
			return;
		}

		// specific rules:
		// hard rule: when DWARF or GOLD are direct neigbors and one of them is selected, only they can be switched


		// soft rule
		// 1) when GOLD is on the outer position, and ZWERG is one if its inner neighbors (or vice versa), you can only switch GOLD and ZWERG
		if( [entityIndicator.GOLD, entityIndicator.ZWERG].includes( this.positions['outer'][outerPos] ) ) {
			console.log("OUTERPOS IS ZWERG OR GOLD", outerPos);
			let leftPos = outerPos - 1;
			if(leftPos < 1) {
				leftPos = 8;
			}
			let rightPos = outerPos + 1;
			// if(rightPos > 8) {
			// 	rightPos = 1
			// }

			console.log("CHECKING NEIGHBORS OF OUERPOS", leftPos, rightPos);

			// when GOLD and ZWERG are in direct neighborhood (inner.leftPos or inner.rightPos are GOLD or ZWERG)
			let dwarfGoldCheck = [this.positions['inner'][leftPos], this.positions['inner'][rightPos]].some(pos => [entityIndicator.GOLD, entityIndicator.ZWERG].includes(pos))
			let innerPosCheck = [entityIndicator.ZWERG, entityIndicator.GOLD].includes( this.positions['inner'][innerPos] );
			isAllowed = dwarfGoldCheck === innerPosCheck;
			console.log("ZWERG/GOLD RULE", dwarfGoldCheck, innerPosCheck, "=", isAllowed);

		}

		if(!isAllowed) {
			handleDisallowed();
			return;
		}

		const oldOuterPositions = {...this.positions['outer']};
		const oldInnerPositions = {...this.positions['inner']};

		let newOuterPositions = {...this.positions['outer']};
		let newInnerPositions = {...this.positions['inner']};

		newOuterPositions[outerPos] = oldInnerPositions[innerPos];
		newInnerPositions[innerPos] = oldOuterPositions[outerPos];

		this.positions = {
			'inner': {...newInnerPositions},
			'outer': {...newOuterPositions}
		};
		this.highlightPos([firstPos, secondPos], 'success', 1000);
		console.log("SUCCESSFULLY SWITCHED", firstPos, secondPos);
	}

	public resetGame() {
		this.positions = {
			'inner': {
				8: entityIndicator.ZWERG,
				2: entityIndicator.DRACHE,
				4: entityIndicator.ORK,
				6: entityIndicator.MENSCH
			},
			'outer': {
				1: entityIndicator.GOLD,
				3: entityIndicator.MORGOTH,
				5: entityIndicator.RINGE,
				7: entityIndicator.SCHWERT
			}
		};
	}

	public selectPosToSwitch(posNum: number) {
		if(!posNum) {
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

	private selectPossiblePositions(posNum: number) {
		if(!posNum) {
			return;
		}
		switch (posNum) {
			case 1:
				this.firstPossibleSwitch = 8;
				this.secondPossibleSwitch = 2;
				break;
			case 8:
				this.firstPossibleSwitch = 7;
				this.secondPossibleSwitch = 1;
				break;
			default:
				this.firstPossibleSwitch = posNum - 1;
				this.secondPossibleSwitch = posNum + 1;
				break;
		}
	}

	public highlightPos(positions: (number|undefined)[] = [ ], className: string, duration: number) {
		console.log("HIGHLIGHT POS ERROR", positions);
		if(!Array.isArray(positions) || !className || !duration) {
			return;
		}

		this.globalControlsDisabled = true;

		positions?.forEach((pos) => {
			if(!pos) {
				return;
			}

			const posEl = document.querySelector(`.position.position-${pos}`);

			posEl?.classList?.add(className);

			setTimeout(() => {
				posEl?.classList?.remove(className);
			}, duration);
		});

		setTimeout(() => {
			this.globalControlsDisabled = false;
		}, duration);
	}
}
