#[derive(Debug, Clone, PartialEq, Eq)]
pub enum IdError {
    Empty,
    WrongLength(usize),
    ProhibitedCharacter(char),
    WrongNumber(u32),
}

// MACHINES
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MachineId(String);

impl MachineId {
    pub fn new(id: &str) -> Result<Self, IdError> {
        if id.is_empty() {
            return Err(IdError::Empty);
        }
        if id.len() != 4 {
            return Err(IdError::WrongLength(id.len()));
        }
        for character in id.chars() {
            if !character.is_ascii_uppercase() && !character.is_ascii_digit() {
                return Err(IdError::ProhibitedCharacter(character));
            }
        }
        Ok(Self(id.to_string())) // doesn't need a rreturn in rust if it's the last line (the fn returns the last line by default)
    }
    pub fn as_str(&self) -> &str {
        &self.0 // not ";" in the end, otherwise the function doens't return anything
    }
}

// LOAD
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LoadId(String);

impl LoadId {
    pub fn new(id: &str) -> Result<Self, IdError> {
        if id.is_empty() {
            return Err(IdError::Empty);
        }
        if id.len() > 12 {
            return Err(IdError::WrongLength(id.len()));
        }
        for character in id.chars() {
            if !character.is_ascii_uppercase() && !character.is_ascii_digit() {
                return Err(IdError::ProhibitedCharacter(character));
            }
        }
        Ok(Self(id.to_string()))
    }
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

//POINT
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PointId(String);

impl PointId {
    pub fn new(id: &str) -> Result<Self, IdError> {
        if id.is_empty() {
            return Err(IdError::Empty);
        }
        if id.len() > 8 {
            return Err(IdError::WrongLength(id.len()));
        }
        for character in id.chars() {
            if !character.is_ascii_uppercase() && !character.is_ascii_digit() && character != '-' {
                return Err(IdError::ProhibitedCharacter(character));
            }
        }
        Ok(Self(id.to_string()))
    }
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

//TASK

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TaskId(u32);

impl TaskId {
    pub fn new(id: u32) -> Result<Self, IdError> {
        if id == 0 || id > 99_999_999 {
            return Err(IdError::WrongNumber(id));
        }
        Ok(Self(id))
    }
    pub fn value(&self) -> u32 {
        self.0 // small numbers are copied, not borrowed (a u32 is 4 bytes, a reference would be 8) so no & needed
    }
}

// TESTS
#[cfg(test)]
mod tests {
    use super::*;
    // TESTS MachineId
    #[test]
    fn an_empty_machine_id_is_refused() {
        let result = MachineId::new("");
        assert_eq!(result.unwrap_err(), IdError::Empty);
    }

    #[test]
    fn a_short_machine_id_is_refused() {
        let result = MachineId::new("CR0");
        assert_eq!(result.unwrap_err(), IdError::WrongLength(3));
    }

    #[test]
    fn a_too_long_machine_id_is_refused() {
        let result = MachineId::new("CR01C");
        assert_eq!(result.unwrap_err(), IdError::WrongLength(5));
    }

    #[test]
    fn a_lowercase_letter_is_refused() {
        let result = MachineId::new("cR01");
        assert_eq!(result.unwrap_err(), IdError::ProhibitedCharacter('c'));
    }

    #[test]
    fn a_punctuation_mark_is_refused() {
        let result = MachineId::new("CR-1");
        assert_eq!(result.unwrap_err(), IdError::ProhibitedCharacter('-'));
    }

    #[test]
    fn a_well_formed_machine_id_is_accepted() {
        let result = MachineId::new("CR01");
        assert!(result.is_ok());
    }
    // TESTS LoadId
    #[test]
    fn an_empty_load_id_is_refused() {
        let result = LoadId::new("");
        assert_eq!(result.unwrap_err(), IdError::Empty);
    }

    #[test]
    fn a_too_long_load_id_is_refused() {
        let result = LoadId::new("LPN0000904120");
        assert_eq!(result.unwrap_err(), IdError::WrongLength(13));
    }

    #[test]
    fn a_lowercase_letter_in_a_load_id_is_refused() {
        let result = LoadId::new("lPN000090412");
        assert_eq!(result.unwrap_err(), IdError::ProhibitedCharacter('l'));
    }

    #[test]
    fn a_punctuation_mark_in_a_load_id_is_refused() {
        let result = LoadId::new("LPN-00090412");
        assert_eq!(result.unwrap_err(), IdError::ProhibitedCharacter('-'));
    }

    #[test]
    fn a_load_id_shorter_than_the_field_is_accepted() {
        let result = LoadId::new("LPN90412");
        assert!(result.is_ok());
    }

    #[test]
    fn a_load_id_filling_the_field_is_accepted() {
        let result = LoadId::new("LPN000090412");
        assert!(result.is_ok());
    }

    // TESTS PointId
    #[test]
    fn an_empty_point_id_is_refused() {
        let result = PointId::new("");
        assert_eq!(result.unwrap_err(), IdError::Empty);
    }

    #[test]
    fn a_too_long_point_id_is_refused() {
        let result = PointId::new("A04-12-70");
        assert_eq!(result.unwrap_err(), IdError::WrongLength(9));
    }

    #[test]
    fn a_forbidden_sign_in_a_point_id_is_refused() {
        let result = PointId::new("A04@12-7");
        assert_eq!(result.unwrap_err(), IdError::ProhibitedCharacter('@'));
    }

    #[test]
    fn a_lowercase_letter_in_a_point_id_is_refused() {
        let result = PointId::new("a04-12-7");
        assert_eq!(result.unwrap_err(), IdError::ProhibitedCharacter('a'));
    }

    #[test]
    fn a_rack_slot_is_accepted() {
        let result = PointId::new("A04-12-7");
        assert!(result.is_ok());
    }

    #[test]
    fn a_transfer_point_is_accepted() {
        let result = PointId::new("IN-A01");
        assert!(result.is_ok());
    }

    // TESTS TaskId
    #[test]
    fn a_task_id_of_zero_is_refused() {
        let result = TaskId::new(0);
        assert_eq!(result.unwrap_err(), IdError::WrongNumber(0));
    }

    #[test]
    fn a_task_id_above_eight_digits_is_refused() {
        let result = TaskId::new(100_000_000);
        assert_eq!(result.unwrap_err(), IdError::WrongNumber(100_000_000));
    }

    #[test]
    fn a_task_id_at_the_maximum_is_accepted() {
        let result = TaskId::new(99_999_999);
        assert!(result.is_ok());
    }

    #[test]
    fn a_well_formed_task_id_is_accepted() {
        let result = TaskId::new(47_321_192);
        assert!(result.is_ok());
    }

    // TESTS accessors
    #[test]
    fn a_machine_id_gives_back_the_text_it_was_built_from() {
        let machine = MachineId::new("CR01").unwrap();
        assert_eq!(machine.as_str(), "CR01");
    }

    #[test]
    fn a_load_id_gives_back_the_text_it_was_built_from() {
        let load = LoadId::new("LPN90412").unwrap();
        assert_eq!(load.as_str(), "LPN90412");
    }

    #[test]
    fn a_point_id_gives_back_the_text_it_was_built_from() {
        let point = PointId::new("A04-12-7").unwrap();
        assert_eq!(point.as_str(), "A04-12-7");
    }

    #[test]
    fn a_task_id_gives_back_the_number_it_was_built_from() {
        let task = TaskId::new(47_321_192).unwrap();
        assert_eq!(task.value(), 47_321_192);
    }
}
