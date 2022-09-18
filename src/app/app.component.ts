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

	private readonly innerPositions = [2, 4, 6, 8];
	private readonly outerPositions = [1, 3, 5, 7];


	public positions !: {[key: string]: {[pos: number]: entityIndicator}};

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
		if(this.singleTurnDegree !== 0) {
			return;
		}

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
		if(this.singleTurnDegree !== 0) {
			return;
		}

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

	public switchInnerAndOuterContent(outerPos: number|undefined, innerPos: number|undefined) {
		if(!outerPos || !innerPos) {
			return;
		}

		let isAllowed = true;
		// check positions and if they are forbidden to switch
		// ...

		// outerPos & innerPos are valid numbers
		isAllowed = this.outerPositions.includes(outerPos);
		isAllowed = this.innerPositions.includes(innerPos);

		if(!isAllowed) {
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
		// turn off the first selected element, if selected again
		if(this.firstPosToSwitch === posNum) {
			this.firstPosToSwitch = undefined;
			return;
		}

		// set the first selected element
		if(this.firstPosToSwitch === undefined) {
			this.firstPosToSwitch = posNum;
		} else {
			const outerPos = this.outerPositions.find(pos => [posNum, this.firstPosToSwitch].includes(pos));
			const innerPos = this.innerPositions.find(pos => [posNum, this.firstPosToSwitch].includes(pos));
			// try to switch elements
			this.switchInnerAndOuterContent(outerPos, innerPos);
			this.firstPosToSwitch = undefined;
		}
	}
}
