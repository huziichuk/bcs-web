#TODO class validation for ammunition user_data
@dataclass
class Ammunition:
		id: str
		filename: str
		user_data: Dict = field(default_factory=dict)